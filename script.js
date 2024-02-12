var reInteger = /^-?\d+$/i;

var rules = {
	"minStartLength": 300,
	"planks": [
		{ "length": 0, "cutDistance": 300 },
		{ "length": 2200, "cutDistance": 500 }
	]
};

function addFix() {
	if ($("#fixRow").is(":disabled") || $("#fixPlankLength").is(":disabled")) {
		alert('Disable "Try to auto correct"');
	} else {
		var fixRow = parseInt($("#fixRow").val());
		var fixPlankLength = parseInt($("#fixPlankLength").val());
		var fixRowStart = parseInt($("#fixRowStart").val());
		var fixRowEnd = parseInt($("#fixRowEnd").val());
		var fix = $("#fixes > .fix[data-fixrow='" + fixRow + "']");
	
		if (fix.length > 0) {
			alert("Row fix already exist");
			$("#fixRow").focus();
		} else if (!reInteger.test(fixRow)) {
			alert("Row number must be a number");
			$("#fixRow").focus();
		} else if (fixRow <= 0) {
			alert("Row number must be larger than zero");
			$("#fixRow").focus();
		} else if (!reInteger.test(fixPlankLength)) {
			alert("First plank length must be a number");
			$("#fixPlankLength").focus();
		} else if (fixPlankLength < 0) {
			$("#fixPlankLength").focus();
			alert("First plank length must be zero or larger than zero");
		} else if (!reInteger.test(fixRowStart)) {
			alert("Row start position must be a number");
			$("#fixRowStart").focus()
		} else if (!reInteger.test(fixRowEnd)) {
			alert("Row end position must be a number");
			$("#fixRowEnd").focus()
		} else if (fixPlankLength <= 0 && fixRowStart == 0 && fixRowEnd == 0) {
			alert("First plank length, Row start position or Row end position must be set");
			$("#fixPlankLength").focus();
		} else {
			addFixHtml(fixRow, fixPlankLength, fixRowStart, fixRowEnd);
			$("#fixRow").val($("#fixRow").attr("min")).focus();
			$("#fixPlankLength").val($("#fixPlankLength").attr("min"));
			$("#fixRowStart").val("0");
			$("#fixRowEnd").val("0");
		}
	}
}

function addFixHtml(row, plankLength, rowStart, rowEnd) {
	var fixes = getFixes();

	if (!reInteger.test(rowEnd)) {
		rowEnd = 0;
	}

	if (!reInteger.test(rowStart)) {
		rowStart = 0;
	}

	fixes.push({
		"plankLength": parseInt(plankLength),
		"row": parseInt(row),
		"rowEnd": parseInt(rowEnd),
		"rowStart": parseInt(rowStart)
	});

	fixes.sort(function (a, b) {
		return a.row - b.row;
	});

	var html = $("#fixes").empty();
	
	var template = $(".fix-rows > .template").clone().removeClass("template").addClass("fix");
	template.find("[data-template='false']").remove();
	template.find("[data-template='true']").removeAttr("data-template").removeClass("d-none");

	template.find("[id]").each(function() {
		var sender = $(this);
		sender.addClass(sender.attr("id").split(/(?=[A-Z])/).join("-").toLowerCase());
		sender.removeAttr("id");
	});

	for (var i=0; i<fixes.length; i++) {
		var group = template.clone();
		group.find(".fix-row").val(fixes[i].row);
		group.find(".fix-plank-length").val(fixes[i].plankLength);
		group.find(".fix-row-start").val(fixes[i].rowStart);
		group.find(".fix-row-end").val(fixes[i].rowEnd);
		html.append(group);
	}
}

function calculate() {
	var calculating = $("#calculating").removeClass("d-none");
	var fixRowError = $("#fixRowError").addClass("d-none");
	var result = $("#result").addClass("d-none");
	var errors = result.find("#errors").addClass("d-none");

	var autoCorrect = $("#autoCorrect").is(":checked");
	var cutDistance = 0;
	var direction = $("#direction").val();
	var fixes = (autoCorrect ? [] : getFixes());
	var plankLength = parseFloat($("#plankLength").val());
	var plankWidth = parseFloat($("#plankWidth").val());
	var packageSize = parseFloat($("#packageSize").val());
	var removeRows = (autoCorrect ? 0 : parseInt($("#removeRows").val()));
	var repeatFixes = $("#repeatFixes").is(":checked");
	var wallDistance = parseFloat($("#wallDistance").val());

	var roomLength = parseFloat($("#room" + (direction == "width" ? "Width" : "Length")).val());
	var roomWidth = parseFloat($("#room" + (direction == "width" ? "Length" : "Width")).val());

	for (var i=rules.planks.length-1; i>=0; i--) {
		if (plankLength >= rules.planks[i].length) {
			cutDistance = rules.planks[i].cutDistance;
			break;
		}
	}

	var errorFixes1 = fixes.filter(function(item) {
		return (item.plankLength == 0 && item.rowStart == 0 && item.rowEnd == 0);
	});

	var errorFixes2 = fixes.filter(function(item) {
		return (item.plankLength > 0 && item.plankLength < rules.minStartLength);
	});

	var errorFixes3 = fixes.filter(function(item) {
		return (item.plankLength > plankLength);
	});

	if (errorFixes1.length > 0 || errorFixes2.length > 0 || errorFixes3.length > 0) {
		var fixRowError1 = fixRowError.find("#fixRowError1").addClass("d-none");
		var fixRowError2 = fixRowError.find("#fixRowError2").addClass("d-none");
		var fixRowError3 = fixRowError.find("#fixRowError3").addClass("d-none");
	
		if (errorFixes1.length > 0) {
			fixRowError1.removeClass("d-none");
		}

		if (errorFixes2.length > 0) {
			fixRowError2.removeClass("d-none").find("span").text(rules.minStartLength);
		}

		if (errorFixes3.length > 0) {
			fixRowError3.removeClass("d-none").find("span").text(plankLength);
		}

		calculating.addClass("d-none");
		fixRowError.removeClass("d-none");

		return false;
	}

	var settings = {
		"fixes": fixes,
		"plankLength": plankLength,
		"plankWidth": plankWidth,
		"packageSize": packageSize,
		"removeRows": removeRows,
		"repeatFixes": repeatFixes,
		"roomLength": roomLength,
		"roomWidth": roomWidth,
		"wallDistance": wallDistance
	};
	var layoutResult = getLayout(settings);

	var isValid = validate(layoutResult, cutDistance);

	if (autoCorrect && !isValid) {
		layoutResult = tryFixLayout(layoutResult, settings, cutDistance);
	}

	calculating.addClass("d-none");
	result.removeClass("d-none");

	result.find("#resultRoomSize > span").text(layoutResult.roomSize);
	result.find("#resultMinStartLength > span").text(rules.minStartLength);
	result.find("#resultPlankWidth > span").text(plankWidth);
	result.find("#resultCutDistance > span").text(cutDistance);
	result.find("#resultRows > span").text(layoutResult.rows);
	result.find("#resultFirstRowWidth > span").text(layoutResult.firstRowWidth);
	result.find("#resultLastRowWidth > span").text(layoutResult.lastRowWidth);
	result.find("#resultPlanksNeeded > span").text(layoutResult.planksNeeded);
	result.find("#resultPackagesNeeded > span").text(layoutResult.packagesNeeded);
	result.find("#resultPlanksUnused > span").text(layoutResult.planksUnused);
	result.find("#resultTrash > span").text(layoutResult.trash >= 1000 ? (layoutResult.trash / 1000) + ' meters' : layoutResult.trash + ' mm');

	var planks = result.find("#planks").empty();
	var table = result.find("table");
	var thead = table.find("thead");
	var tbody = table.find("tbody").empty();
	var hasInvalid = false;

	if (layoutResult.layout.length > 0) {
		var maxRowLength = 0;
		var minRowLength = 0;
		var mostPlanks = 0;
		var rowEndMax = 0;
		var rowEndMin = 0;
		var rowStartMax = 0;
		var rowStartMin = 0;
		
		for (var i=0; i<layoutResult.layout.length; i++) {
			maxRowLength = Math.max(maxRowLength, layoutResult.layout[i].length);
			mostPlanks = Math.max(mostPlanks, layoutResult.layout[i].planks.length);
			rowEndMax = Math.max(rowEndMax, layoutResult.layout[i].position.end);
			rowStartMax = Math.max(rowStartMax, layoutResult.layout[i].position.start);
			rowEndMin = Math.min(rowEndMin, layoutResult.layout[i].position.end);
			rowStartMin = Math.min(rowStartMin, layoutResult.layout[i].position.start);
			
			if (minRowLength == 0 || minRowLength > layoutResult.layout[i].length) {
				minRowLength = layoutResult.layout[i].length;
			}			
		}
		
		maxRowLength += rowStartMin * -1;
		maxRowLength += rowEndMax;
		
		thead.find("th:eq(1)").attr("colspan", mostPlanks);
		
		for (var i=0; i<layoutResult.layout.length; i++) {
			var iItem = layoutResult.layout[i];
			var row = $('<div class="row"><span>#' + (i + 1) + '</span></div>');
			var tr = $('<tr><th>' + (i + 1) + '</th></tr>');
			
			var diffStart = (rowStartMin * -1) + iItem.position.start;
			
			if (diffStart > 0) {
				var percentage = (diffStart / maxRowLength) * 100;
				row.append($('<div class="bg-white"></div>').width(percentage + "%"))
			}
			
			for (var j=0; j<mostPlanks; j++) {
				if (j<iItem.planks.length) {
					var jItem = iItem.planks[j];
					var percentage = (jItem.length / maxRowLength) * 100;
					row.append($('<div class="' + (jItem.valid ? "" : "text-bg-danger") + ' border" title="' + jItem.length + ' mm"><span>' + jItem.length + ' mm</span></div>').width(percentage + "%"))
					tr.append('<td class="' + (jItem.valid ? "" : "text-bg-danger") + '">' + jItem.length + ' mm</td>');
		
					if (!jItem.valid) {
						hasInvalid = true;
					}
				} else {
					tr.append('<td></td>');
				}
			}
			
			var diffEnd = maxRowLength - (iItem.length + diffStart);
			
			if (diffEnd > 0) {
				var percentage = (diffEnd / maxRowLength) * 100;
				row.append($('<div class="bg-white"></div>').width(percentage + "%"))
			}
			
			tr.append('<td>' + iItem.width + ' mm</td>');
	
			planks.append(row);
			tbody.append(tr);
		}
	}

	if (hasInvalid || layoutResult.lastRowWidth > settings.plankWidth || layoutResult.lastRowWidth < (settings.plankWidth / 2)) {
		var error1 = errors.find("#error1").addClass("d-none");
		var error2 = errors.find("#error2").addClass("d-none");
		var error3 = errors.find("#error3").addClass("d-none");
		errors.find(".alert").addClass("d-none");
		
		if (hasInvalid) {
			error1.removeClass("d-none").closest(".alert").removeClass("d-none");
		}
		
		if (layoutResult.lastRowWidth > settings.plankWidth) {
			error2.removeClass("d-none").find("span").text(settings.plankWidth).closest(".alert").removeClass("d-none");
			planks.find("div.row:last").addClass("border border-2 border-danger");
			tbody.find("tr:last > td:last").addClass("text-bg-danger");
		} else if (layoutResult.lastRowWidth < (settings.plankWidth / 2)) {
			error3.removeClass("d-none").find("span").text(layoutResult.lastRowWidth).closest(".alert").removeClass("d-none");
			planks.find("div.row:last").addClass("border border-2 border-info");
			tbody.find("tr:last > td:last").addClass("text-bg-info");
		}
		
		errors.removeClass("d-none");
	}

	result.find("input[name^='output']:checked:first").trigger("change");

	return false;
}

function clone(input) {
	return JSON.parse(JSON.stringify(input));
}

function deleteFix(sender) {
	$(sender).closest("div.fix").remove();
}

function getFixes() {
	var fixes = [];

	$("#fixes > .fix").each(function() {
		fixes.push({
			"plankLength": parseInt($(this).find(".fix-plank-length").val()),
			"row": parseInt($(this).find(".fix-row").val()),
			"rowEnd": parseInt($(this).find(".fix-row-end").val()),
			"rowStart": parseInt($(this).find(".fix-row-start").val())
		});
	});

	fixes.sort(function (a, b) {
		return a.row - b.row;
	});

	return fixes;
}

function getLayout(settings) {
	var result = {
		"firstRowWidth": settings.plankWidth,
		"lastRowWidth": 0,
		"layout": [],
		"packagesNeeded": 0,
		"planksNeeded": 0,
		"planksUnused": 0,
		"roomLengthWithDistance": 0,
		"roomSize": 0,
		"roomWidthWithDistance": 0,
		"rows": rows,
		"trash": 0
	};
	
	if (reInteger.test($("#firstRowWidth").val()) && parseInt($("#firstRowWidth").val()) < settings.plankWidth) {
		result.firstRowWidth = parseInt($("#firstRowWidth").val());
	}

	var leftovers = 0;
	var plankLeftovers = [];
	var rowsSkipped = 0;

	var roomLengthWithDistance = Math.round((settings.roomLength * 1000) - (settings.wallDistance * 2));
	var roomWidthWithDistance = Math.round((settings.roomWidth * 1000) -  (settings.wallDistance * 2));

	var rowsOrg = roomWidthWithDistance / settings.plankWidth;
	var rows = Math.ceil(rowsOrg);
	
	var fixes = [];
	
	if (settings.fixes.length > 0) {
		if (settings.repeatFixes) {
			var repeatRow = 1;
		
			for (var i=0; i<rows; i++) {
				var fixOrg = settings.fixes.filter(function(item) {
					return (item.row == repeatRow);
				})[0];
				var fix = (fixOrg ? clone(fixOrg) : null);
				
				if (i > 0 && repeatRow == 1) {
					if (!fix) {
						fix = {
							"plankLength": settings.plankLength,
							"row": (i + 1),
							"rowEnd": 0,
							"rowStart": 0
						};
					}
					
					if (fix.plankLength == 0) {
						fix.plankLength = settings.plankLength;
					}
				}

				if (fix) {
					fix.row = (i + 1);				
					fixes.push(fix);
				}
				
				if (settings.fixes.indexOf(fixOrg) + 1 == settings.fixes.length) {
					repeatRow = 1;
				} else {
					repeatRow++;
				}
			}
		} else {
			fixes = clone(settings.fixes);
		}
	}
	
	for (var i=0; i<rows; i++) {
		var fix = fixes.filter(function(item) {
			return (item.row == (i + 1));
		})[0];
		var maxRowLength = roomLengthWithDistance;
		var rowLength = 0;
		var saveLeftovers = 0;

		if (fix && fix.rowStart != 0) {
			maxRowLength += (fix.rowStart * -1);
		}

		if (fix && fix.rowEnd != 0) {
			maxRowLength += fix.rowEnd;
		}
		
		var rowWidth = (i + 1 == rows ? parseFloat(((rowsOrg - Math.floor(rowsOrg)) * settings.plankWidth).toFixed(2)) : settings.plankWidth);
		
		if (result.firstRowWidth < settings.plankWidth) {
			if (i == 0) {
				rowWidth = result.firstRowWidth;
			} else if (i + 1 == rows) {
				rowWidth += (settings.plankWidth - result.firstRowWidth);
			}
		} 

		result.layout.push({
			"row": i + 1,
			"length": maxRowLength,
			"width": rowWidth,
			"position": {
				"start": (fix && fix.rowStart != 0 ? fix.rowStart : 0),
				"end": (fix && fix.rowEnd != 0 ? fix.rowEnd : 0)
			},
			"planks": []
		});

		if (i > 0 && settings.removeRows > 1 && (i + 1 + rowsSkipped) % settings.removeRows == 0) {
			rowsSkipped++;
			saveLeftovers = leftovers;
		}

		if (fix != undefined && fix.plankLength > 0) {
			if (leftovers >= fix.plankLength) {
				result.trash += (leftovers - fix.plankLength);
			} else {
				var diff = (settings.plankLength - fix.plankLength);

				if (diff > 0 && diff >= rules.minStartLength) {
					plankLeftovers.push({
						"length": diff,
						"startCut": false
					});
				} else if (diff > 0) {
					result.trash += diff;
				}

				result.planksNeeded++;
				saveLeftovers = leftovers;
			}

			leftovers = fix.plankLength;
		}

		if (saveLeftovers > 0) {
			if (saveLeftovers >= rules.minStartLength) {
				plankLeftovers.push({
					"length": saveLeftovers,
					"startCut": true
				});
			} else {
				result.trash += saveLeftovers;
			}

			saveLeftovers = 0;

			if (fix == undefined) {
				leftovers = settings.plankLength;
				result.planksNeeded++;
			}
		}

		if (leftovers > 0) {
			if (leftovers >= rules.minStartLength) {
				result.layout[i].planks.push({
					"start": rowLength,
					"stop": rowLength + leftovers,
					"length": leftovers,
					"valid": false
				});

				rowLength += leftovers;
			} else {
				result.trash += leftovers;
			}

			leftovers = 0;
		}

		while (rowLength < maxRowLength) {
			if (rowLength + settings.plankLength <= maxRowLength) {
				result.layout[i].planks.push({
					"start": rowLength,
					"stop": rowLength + settings.plankLength,
					"length": settings.plankLength,
					"valid": false
				});

				rowLength += settings.plankLength;
			} else {
				var diff = maxRowLength - rowLength;

				/*if (result.layout[i].planks.length > 0 && diff < settings.plankWidth && result.layout[i].planks[0].length - (settings.plankWidth - diff) >= rules.minStartLength) {
					rowLength -= (settings.plankWidth - diff);
					result.layout[i].planks[0].length -= (settings.plankWidth - diff);

					for (var j=0; j<result.layout[i].planks.length; j++) {
						if (j > 0) {
							result.layout[i].planks[j].start -= (settings.plankWidth - diff);
						}

						result.layout[i].planks[j].stop -= (settings.plankWidth - diff);
					}

					diff = settings.plankWidth;
				}*/
				
				result.layout[i].planks.push({
					"start": rowLength,
					"stop": rowLength + diff,
					"length": diff,
					"valid": false
				});

				rowLength += diff;

				leftovers = settings.plankLength - diff;
			}

			result.planksNeeded++;
		}
	}

	result.trash += leftovers;
	leftovers = 0;
	
	for (var i=0; i<plankLeftovers.length; i++) {
		result.trash += plankLeftovers[i].length;
	}
	
	if (result.layout.length > 0) {
		result.lastRowWidth = result.layout[result.layout.length - 1].width;
	}
	result.packagesNeeded = Math.ceil(result.planksNeeded / settings.packageSize);
	result.planksUnused = (result.packagesNeeded * settings.packageSize) - result.planksNeeded;
	result.roomLengthWithDistance = roomLengthWithDistance;
	result.roomSize = parseFloat((settings.roomLength * settings.roomWidth).toFixed(2));
	result.roomWidthWithDistance = roomWidthWithDistance;
	result.rows = rows;

	return result;
}

function getLink() {
	var roomLength = $("#roomLength").val();
	var roomWidth = $("#roomWidth").val();
	var plankLength = $("#plankLength").val();
	var plankWidth = $("#plankWidth").val();
	var packageSize = $("#packageSize").val();
	var wallDistance = $("#wallDistance").val();
	var firstRowWidth = $("#firstRowWidth").val();
	var direction = $("#direction").val();
	var autoCorrect = $("#autoCorrect").is(":checked");
	var removeRows = $("#removeRows").val();
	var fixes = getFixes();
	var repeatFixes = $("#repeatFixes").is(":checked");
	var output = $("input[name='output1']:checked").val();

	var kvFixes = [];
	for (var i=0; i<fixes.length; i++) {
		kvFixes.push(fixes[i].row + ":" + fixes[i].plankLength + ":" + fixes[i].rowStart + ":" + fixes[i].rowEnd);
	}

	var url = location.href.split("?")[0];
	url += "?rl=" + roomLength;
	url += "&rw=" + roomWidth;
	url += "&pl=" + plankLength;
	url += "&pw=" + plankWidth;
	url += "&ps=" + packageSize;
	url += "&wd=" + wallDistance;
	url += "&frw=" + firstRowWidth;
	url += "&d=" + direction;
	url += "&ac=" + autoCorrect;
	url += "&rr=" + removeRows;
	url += "&f=" + kvFixes.join(",");
	url += "&rf=" + repeatFixes;
	url += "&o=" + output;

	navigator.clipboard.writeText(url);
	alert("Copied to clipboard!");
}

function parseQuery(queryString) {
	var query = {};
	var pairs = (queryString[0] === "?" ? queryString.substr(1) : queryString).split("&");

	for (var i=0; i<pairs.length; i++) {
		var pair = pairs[i].split("=");
		query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
	}

	return query;
}

function toggleErrorCorrection(enabled) {
	$("#removeRows").attr("disabled", enabled);
	$(".fix-rows input").attr("disabled", enabled);
	
	if (!enabled) {
		$("#fixRow").val($("#fixRow").attr("min"));
		$("#fixPlankLength").val($("#fixPlankLength").attr("min"));
		$("#fixRowStart").val(0);
		$("#fixRowEnd").val(0);
	}
}

function tryFixLayout(layoutResult, settings, cutDistance) {
	var solutions = [ "planklength" ];

	for (var i=0; i<solutions.length; i++) {
		var solution = solutions[i];
		var fixLayoutResult = clone(layoutResult);
		var fixSettings = clone(settings);
		var isValid = false;

		if (solution == "planklength") {
			fixLayoutResult = tryFixLayoutPlankLength(fixLayoutResult, fixSettings, cutDistance);
			isValid = validate(fixLayoutResult, cutDistance);

			if (isValid) {
				layoutResult = fixLayoutResult;
				break;
			}
		}
	}

	return layoutResult;
}

function tryFixLayoutPlankLength(layoutResult, settings, cutDistance) {
	for (var i=0; i<layoutResult.layout.length; i++) {
		var iItem = layoutResult.layout[i];

		if (iItem.planks.length > 1) {
			var invalidCount = iItem.planks.filter(function (item) {
				return !item.valid;
			});
			
			if (invalidCount.length > 0) {
				var prevRow = layoutResult.layout[i - 1];
				var nextRow = layoutResult.layout[i + 1];
				var prevCuts = [];
				var nextCuts = [];

				if (prevRow != null) {
					for (var j=0; j<prevRow.planks.length; j++) {
						var jItem = prevRow.planks[j];

						if (jItem.stop < layoutResult.roomLengthWithDistance) {
							prevCuts.push(jItem.stop);
						}
					}
				}

				if (nextRow != null) {
					for (var j=0; j<nextRow.planks.length; j++) {
						var jItem = nextRow.planks[j];

						if (jItem.stop < layoutResult.roomLengthWithDistance) {
							nextCuts.push(jItem.stop);
						}
					}
				}
				
				if (iItem.planks.length > 0) {
					var jItem = iItem.planks[0];
					
					if (!jItem.valid && jItem.start == 0) {
						var diff = 0;
						var prevDiffs = [];
						var nextDiffs = [];
			
						if (jItem.stop < layoutResult.roomLengthWithDistance) {
							if (prevCuts.length > 0) {
								for (var k=0; k<prevCuts.length; k++) {
									var kItem = prevCuts[k];
									var innerDiff = kItem - jItem.stop;
				
									if (innerDiff < cutDistance && innerDiff > -cutDistance) {
										prevDiffs.push(innerDiff);
									}
								}
							}
			
							if (nextCuts.length > 0) {
								for (var k=0; k<nextCuts.length; k++) {
									var kItem = nextCuts[k];
									var innerDiff = kItem - jItem.stop;
				
									if (innerDiff < cutDistance && innerDiff > -cutDistance) {
										nextDiffs.push(innerDiff);
									}
								}
							}
						}
	
						if (prevDiffs.length > 0) {
							diff = prevDiffs[0];
						} else if (nextDiffs.length > 0) {
							diff = nextDiffs[0];
						}
						
						if (diff != 0) {
							var fix = cutDistance - diff;
	
							if (jItem.start == 0 && (iItem.planks[iItem.planks.length - 1].length + fix) <= settings.plankLength && (jItem.length - fix) > rules.minStartLength) {									
								jItem.stop -= fix;
								jItem.length -= fix;
	
								for (var k=0; k<iItem.planks.length; k++) {
									var kItem = iItem.planks[k];
	
									if (k > 0) {
										kItem.start -= fix;
	
										if (k < (iItem.planks.length - 1)) {
											kItem.stop -= fix;
										} else {
											kItem.stop += fix;
											kItem.length += fix;
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return layoutResult;
}

function validate(layoutResult, cutDistance) {
	var isValid = true;

	for (var i=0; i<layoutResult.layout.length; i++) {
		var iItem = layoutResult.layout[i];
		var prevRow = layoutResult.layout[i - 1];
		var nextRow = layoutResult.layout[i + 1];
		var cuts = [];

		if (prevRow != null) {
			for (var j=0; j<prevRow.planks.length; j++) {
				var jItem = prevRow.planks[j];

				if (jItem.stop < prevRow.length) {
					cuts.push(jItem.stop + prevRow.position.start);
				}
			}
		}

		if (nextRow != null) {
			for (var j=0; j<nextRow.planks.length; j++) {
				var jItem = nextRow.planks[j];

				if (jItem.stop < nextRow.length) {
					cuts.push(jItem.stop + nextRow.position.start);
				}
			}
		}

		for (var j=0; j<iItem.planks.length; j++) {
			var jItem = iItem.planks[j];
			var valid = true;

			if (jItem.stop < iItem.length && cuts.length > 0) {
				for (var k=0; k<cuts.length; k++) {
					var kItem = cuts[k];
					var diff = kItem - (jItem.stop + iItem.position.start);
					
					if (diff < cutDistance && diff > -cutDistance) {
						valid = false;
						break;
					}
				}
			}

			jItem.valid = valid;

			if (!jItem.valid) {
				isValid = false;
			}
		}
	}

	return isValid;
}

$(document).ready(function() {
	var reFix = /^\d+(:-?\d+)+(,\d+(:-?\d+)+)*$/i;

	var query = parseQuery(location.href.substring(location.href.indexOf("?")));

	if (query.rl) {
		$("#roomLength").val(query.rl);
	}

	if (query.rw) {
		$("#roomWidth").val(query.rw);
	}

	if (query.pl) {
		$("#plankLength").val(query.pl);
	}

	if (query.pw) {
		$("#plankWidth").val(query.pw);
	}

	if (query.ps) {
		$("#packageSize").val(query.ps);
	}

	if (query.wd) {
		$("#wallDistance").val(query.wd);
	}

	if (query.frw) {
		$("#firstRowWidth").val(query.frw);
	} else if (query.pw) {
		$("#firstRowWidth").val(query.pw);
	}

	if (query.d == "length" || query.d == "width") {
		$("#direction").val(query.d);
	}

	if (query.ac) {
		$("#autoCorrect").prop("checked", (query.ac == "true"));
	}

	if (query.rr) {
		$("#removeRows").val(query.rr);
	}

	if (query.f && reFix.test(query.f)) {
		var pairs = query.f.split(",");

		for (var i=0; i<pairs.length; i++) {
			var pair = pairs[i].split(":");
			var fix = $("#fixes > .fix[data-fixrow='" + pair[0] + "']");

			if (fix.length == 0) {
				addFixHtml(pair[0], pair[1], pair[2], pair[3]);
			}
		}
	}

	if (query.rf) {
		$("#repeatFixes").prop("checked", (query.rf == "true"));
	}
	
	if (query.o == "layout" || query.o == "list") {
		$("input[name^='output'][value='" + query.o + "']").prop("checked", true);
	}
	
	$("[data-copy]").each(function() {
		var copyTo = $(this);
		
		$(copyTo.data("copy")).change(function() {
			var copyFrom = $(this);
			
			if (reInteger.test(copyFrom.val())) {
				copyTo.attr("max", copyFrom.val());
				copyTo.val(copyFrom.val());
			}
		});
	});
	
	$("#autoCorrect").change(function() {
		toggleErrorCorrection($(this).is(":checked"));
	}).trigger("change");
	
	$(document).on("keydown", ".fix-row, .fox-plank-length", function(e) {
		if (e.key == "Delete") {
			e.preventDefault();
			$(this).closest("div").find("button").trigger("click");
		}
	});
	
	$("#result input[name^='output']").change(function() {
		if (this.value == "list") {
			$("#result #planks").addClass("d-none");
			$("#result table").removeClass("d-none");
		} else {
			$("#result table").addClass("d-none");
			$("#result #planks").removeClass("d-none");
		}
		
		var rbs = $("input[name^='output'][value='" + this.value + "']").not(this);
		rbs.prop("checked", $(this).prop("checked"));
	});

	setTimeout(function() {
		$("#calc").trigger("click");
	}, 100);
});