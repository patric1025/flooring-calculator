var domains = [
	"barlinek.cf",
	"barlinek.ga",
	"barlinek.gq",
	"barlinek.ml",
	"barlinek.tk"
];

var rules = {
	"minStartLength": 300,
	"planks": [
		{ "length": 0, "cutDistance": 300 },
		{ "length": 2200, "cutDistance": 500 }
	]
};

var useOldValidateAndTryFix = false;

function addFix() {
	if ($("#fixRow").is(":disabled") || $("#fixPlankLength").is(":disabled")) {
		alert('Disable "Try to auto correct"');
	} else {
		var fixRow = parseInt($("#fixRow").val());
		var fixPlankLength = parseFloat($("#fixPlankLength").val());
		var fix = $("#fixes > .fix[data-fixrow='" + fixRow + "']");
	
		if (fix.length > 0) {
			alert("Row fix already exist");
		} else if (fixRow <= 0) {
			alert("Row number must be larger than zero");
			$("#fixRow").focus();
		} else if (fixPlankLength <= 0) {
			alert("Plank length must be larger than zero");
			$("#fixPlankLength").focus();
		} else {
			addFixHtml(fixRow, fixPlankLength);
			$("#fixRow").val("1").focus();
			$("#fixPlankLength").val("0");
		}
	}
}

function addFixHtml(row, plankLength) {
	var fixes = getFixes();

	fixes.push({
		"plankLength": parseInt(plankLength),
		"row": parseInt(row)
	});

	fixes.sort(function (a, b) {
		return a.row - b.row;
	});

	var html = $("#fixes").empty();
	
	var template = $('<div class="input-group mt-1 fix"><span class="input-group-text">#</span><input type="number" class="form-control fix-row" min="1" step="1" required value="1"><input type="number" class="form-control fix-plank-length" min="0" step="1" required value="0"><span class="input-group-text">mm</span><button class="btn btn-danger" onclick="deleteFix(this)" type="button"><i class="bi bi-trash"></i></button></div>');

	for (var i=0; i<fixes.length; i++) {
		var group = template.clone();
		group.find(".fix-row").val(fixes[i].row);
		group.find(".fix-plank-length").val(fixes[i].plankLength);
		html.append(group);
	}
}

function calculate() {
	var result = $("#result").empty().append("<hr />").text("Calculating...");

	var autoCorrect = $("#autoCorrect").is(":checked");
	var cutDistance = 0;
	var direction = $("#direction").val();
	var fixes = (autoCorrect ? [] : getFixes());
	var plankLength = parseFloat($("#plankLength").val());
	var plankWidth = parseFloat($("#plankWidth").val());
	var packageSize = parseFloat($("#packageSize").val());
	var removeRows = (autoCorrect ? 0 : parseInt($("#removeRows").val()));
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
		return (item.plankLength < rules.minStartLength);
	});

	var errorFixes2 = fixes.filter(function(item) {
		return (item.plankLength > plankLength);
	});

	if (errorFixes1.length > 0 || errorFixes2.length > 0) {
		result.empty().append('<hr />');
		var error = $('<div class="alert alert-warning"></div>');

		if (errorFixes1.length > 0) {
			error.append('<div>One or more "fixed first plank length" lengths are shorter than minimum length (' + rules.minStartLength + ' mm)</div>');
		}

		if (errorFixes2.length > 0) {
			error.append('<div >One or more "' + $("label[for='fixRow']").text() + '" lengths are longer than plank length (' + plankLength + ' mm)</div>');
		}

		result.append(error);

		return false;
	}

	var settings = {
		"fixes": fixes,
		"plankLength": plankLength,
		"plankWidth": plankWidth,
		"packageSize": packageSize,
		"removeRows": removeRows,
		"roomLength": roomLength,
		"roomWidth": roomWidth,
		"wallDistance": wallDistance
	};
	var layoutResult = getLayout(settings);

	var isValid = validate(layoutResult, cutDistance);

	if (autoCorrect && !isValid) {
		layoutResult = tryFixLayout(layoutResult, settings, cutDistance);
	}

	result.empty().append("<hr />");

	result.append($('<div><b>Room area:</b> ' + layoutResult.roomSize + ' m<sup>2</sup></div>'));
	result.append($('<div><b>Minumum start length:</b> ' + rules.minStartLength + ' mm</div>'));
	result.append($('<div><b>Minumum end length:</b> ' + plankWidth + ' mm</div>'));
	result.append($('<div><b>Distance between cuts for nearby rows:</b> ' + cutDistance + ' mm</div>'));
	result.append($('<div><b>Rows:</b> ' + layoutResult.rows + '</div>'));
	result.append($('<div><b>Width of last row:</b> ' + layoutResult.lastRowWidth + ' mm</div>'));
	result.append($('<div><b>Planks needed:</b> ' + layoutResult.planksNeeded + '</div>'));
	result.append($('<div><b>Packages needed:</b> ' + layoutResult.packagesNeeded + '</div>'));
	result.append($('<div><b>Planks unused:</b> ' + layoutResult.planksUnused + '</div>'));
	result.append($('<div><b>Trash:</b> ' + (layoutResult.trash >= 1000 ? (layoutResult.trash/1000) + ' meters' : layoutResult.trash + ' mm') + '</div>'));
	result.append($('<div>&nbsp;</div>'));
	result.append($('<div class="text-end"><button class="btn btn-primary" onclick="link();" type="button">Copy direct link</button></div>'));
	result.append($('<div>&nbsp;</div>'));

	var planks = $('<div id="planks"></div>');
	var table = $('<div id="table"></div>');
	var hasInvalid = false;

	for (var i=0; i<layoutResult.layout.length; i++) {
		var iItem = layoutResult.layout[i];
		var row = $('<div class="row"><span>#' + (i + 1) + '</span></div>');
		var row2 = $('<div><b>Row ' + (i + 1) + ':</b></div>');

		for (var j=0; j<iItem.planks.length; j++) {
			var jItem = iItem.planks[j];
			var percentage = (jItem.length / layoutResult.roomLengthWithDistance) * 100;
			row.append($('<div class="' + (jItem.valid ? "text-bg-secondary" : "text-bg-danger") + ' border" title="' + jItem.length + ' mm"><span>' + jItem.length + ' mm</span></div>').width(percentage + "%"))
			row2.append($('<span>' + jItem.length + ' mm</span>'));

			if (!jItem.valid) {
				hasInvalid = true;
			}
		}

		row2.append($('<span>(width: ' + iItem.width + ' mm)</span>'));

		planks.append(row);
		table.append(row2);
	}

	if (hasInvalid) {
		result.append($('<div class="alert alert-danger">Red planks means that plank joints are too close to each other. Use "Error correction" settings to try to fix it.</div>'));
	}

	result.append(planks);
	result.append($('<div>&nbsp;</div>'));
	result.append($('<div class="text-end"><button class="btn btn-primary" onclick="link();" type="button">Copy direct link</button></div>'));
	result.append($('<div>&nbsp;</div>'));
	result.append(table);

	return false;
}

function clone(input) {
	return JSON.parse(JSON.stringify(input));
}

function deleteFix(sender) {
	$(sender).closest("div").remove();
}

function getFixes() {
	var fixes = [];

	$("#fixes > .fix").each(function() {
		fixes.push({
			"plankLength": parseInt($(this).find(".fix-plank-length").val()),
			"row": parseInt($(this).find(".fix-row").val())
		});
	});

	fixes.sort(function (a, b) {
		return a.row - b.row;
	});

	return fixes;
}

function getLayout(settings) {
	/*settings = {
		"fixes": [{ "plankLength": 0, "row": 0 }],
		"plankLength": 0,
		"plankWidth": 0,
		"packageSize": 0,
		"removeRows": 0,
		"roomLength": 0.01,
		"roomWidth": 0.01,
		"wallDistance": 0
	};*/

	var result = {
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

	var leftovers = 0;
	var plankLeftovers = [];
	var rowsSkipped = 0;

	var roomLengthWithDistance = (settings.roomLength * 1000) - (settings.wallDistance * 2);
	var roomWidthWithDistance = (settings.roomWidth * 1000) -  (settings.wallDistance * 2);

	var rowsOrg = roomWidthWithDistance / settings.plankWidth;
	var rows = Math.ceil(rowsOrg);

	for (var i=0; i<rows; i++) {
		var fix = settings.fixes.filter(function(item) {
			return (item.row == (i + 1));
		})[0];
		var rowLength = 0;
		var saveLeftovers = 0;

		result.layout.push({
			"row": i + 1,
			"width": (i + 1 == rows ? parseFloat(((rowsOrg - Math.floor(rowsOrg)) * settings.plankWidth).toFixed(2)) : settings.plankWidth),
			"planks": []
		});

		if (i > 0 && settings.removeRows > 1 && (i + 1 + rowsSkipped) % settings.removeRows == 0) {
			rowsSkipped++;
			saveLeftovers = leftovers;
		}

		if (fix != undefined) {
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

		while (rowLength < roomLengthWithDistance) {
			if (rowLength + settings.plankLength <= roomLengthWithDistance) {
				result.layout[i].planks.push({
					"start": rowLength,
					"stop": rowLength + settings.plankLength,
					"length": settings.plankLength,
					"valid": false
				});

				rowLength += settings.plankLength;
			} else {
				var diff = roomLengthWithDistance - rowLength;

				if (result.layout[i].planks.length > 0 && diff < settings.plankWidth && result.layout[i].planks[0].length - (settings.plankWidth - diff) >= rules.minStartLength) {
					rowLength -= (settings.plankWidth - diff);
					result.layout[i].planks[0].length -= (settings.plankWidth - diff);

					for (var j=0; j<result.layout[i].planks.length; j++) {
						if (j > 0) {
							result.layout[i].planks[j].start -= (settings.plankWidth - diff);
						}

						result.layout[i].planks[j].stop -= (settings.plankWidth - diff);
					}

					diff = settings.plankWidth;
				}

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

function link() {
	var roomLength = $("#roomLength").val();
	var roomWidth = $("#roomWidth").val();
	var plankLength = $("#plankLength").val();
	var plankWidth = $("#plankWidth").val();
	var packageSize = $("#packageSize").val();
	var wallDistance = $("#wallDistance").val();
	var direction = $("#direction").val();
	var autoCorrect = $("#autoCorrect").is(":checked");
	var removeRows = $("#removeRows").val();
	var fixes = getFixes();

	var kvFixes = [];
	for (var i=0; i<fixes.length; i++) {
		kvFixes.push(fixes[i].row + ":" + fixes[i].plankLength);
	}

	var url = location.href.split("?")[0];
	url += "?rl=" + roomLength;
	url += "&rw=" + roomWidth;
	url += "&pl=" + plankLength;
	url += "&pw=" + plankWidth;
	url += "&ps=" + packageSize;
	url += "&wd=" + wallDistance;
	url += "&d=" + direction;
	url += "&ac=" + autoCorrect;
	url += "&rr=" + removeRows;
	url += "&f=" + kvFixes.join(",");

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
	$("#removeRows").attr("disabled", !enabled);
	$(".fix-rows input").attr("disabled", !enabled);
	
	if (!enabled) {
		$("#fixRow").val($("#fixRow").attr("min"));
		$("#fixPlankLength").val($("#fixPlankLength").attr("min"));
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
	if (useOldValidateAndTryFix) {
		for (var i=0; i<layoutResult.layout.length; i++) {
			var iItem = layoutResult.layout[i];
			var doBreak = false;
	
			if (iItem.planks.length > 1) {
				for (var j=0; j<iItem.planks.length; j++) {
					var jItem = iItem.planks[j];
	
					if (!jItem.valid && jItem.start == 0 || jItem.stop == layoutResult.roomLengthWithDistance) {
						var diff = 0;
	
						if (jItem.prevDiffs.length > 0) {
							diff = jItem.prevDiffs[0];
						} else if (jItem.nextDiffs.length > 0) {
							diff = jItem.nextDiffs[0];
						}
	
						if (diff > 0) {
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
							} else if (jItem.stop == layoutResult.roomLengthWithDistance && (jItem.length - fix) > rules.minStartLength) {
								jItem.stop -= fix;
								jItem.length -= fix;
							}
						} else if (diff < 0) {
							diff *= -1;
							var fix = cutDistance - diff;
	
							if (jItem.start == 0 && (iItem.planks[iItem.planks.length - 1].length - fix) >= settings.plankWidth && (jItem.length + fix) <= settings.plankLength) {
								jItem.stop += fix;
								jItem.length += fix;
	
								for (var k=0; k<iItem.planks.length; k++) {
									var kItem = iItem.planks[k];
	
									if (k > 0) {
										kItem.start += fix;
	
										if (k < (iItem.planks.length - 1)) {
											kItem.stop += fix;
										} else {
											kItem.stop -= fix;
											kItem.length -= fix;
										}
									}
								}
							} else if (jItem.stop == layoutResult.roomLengthWithDistance && (jItem.length + fix) <= settings.plankLength) {
								jItem.stop += fix;
								jItem.length += fix;
							}
						}
					}
	
					if (doBreak) {
						return false;
					}
				}
			}
	
			if (doBreak) {
				return false;
			}
		}
	} else {
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
	}

	return layoutResult;
}

function validate(layoutResult, cutDistance) {
	var isValid = true;

	if (useOldValidateAndTryFix) {
		for (var i=0; i<layoutResult.layout.length; i++) {
			var iItem = layoutResult.layout[i];
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
	
			for (var j=0; j<iItem.planks.length; j++) {
				var jItem = iItem.planks[j];
				var validCount = 0;
				jItem.prevDiffs = [];
				jItem.nextDiffs = [];
	
				if (jItem.stop < layoutResult.roomLengthWithDistance && prevCuts.length > 0) {
					var validCuts = 0;
	
					for (var k=0; k<prevCuts.length; k++) {
						var kItem = prevCuts[k];
						var diff = kItem - jItem.stop;
	
						if (diff >= cutDistance || diff <= -cutDistance) {
							validCuts++;
						} else {
							jItem.prevDiffs.push(diff);
						}
					}
	
					if (validCuts == prevCuts.length) {
						validCount++;
					}
				} else {
					validCount++;
				}
	
				if (jItem.stop < layoutResult.roomLengthWithDistance && nextCuts.length > 0) {
					var validCuts = 0;
	
					for (var k=0; k<nextCuts.length; k++) {
						var kItem = nextCuts[k];
						var diff = kItem - jItem.stop;
	
						if (diff >= cutDistance || diff <= -cutDistance) {
							validCuts++;
						} else {
							jItem.nextDiffs.push(diff);
						}
					}
	
					if (validCuts == nextCuts.length) {
						validCount++;
					}
				} else {
					validCount++;
				}
	
				jItem.valid = (validCount == 2);
	
				if (!jItem.valid) {
					isValid = false;
				}
			}
		}
	} else {
		for (var i=0; i<layoutResult.layout.length; i++) {
			var iItem = layoutResult.layout[i];
			var prevRow = layoutResult.layout[i - 1];
			var nextRow = layoutResult.layout[i + 1];
			var cuts = [];
	
			if (prevRow != null) {
				for (var j=0; j<prevRow.planks.length; j++) {
					var jItem = prevRow.planks[j];
	
					if (jItem.stop < layoutResult.roomLengthWithDistance) {
						cuts.push(jItem.stop);
					}
				}
			}
	
			if (nextRow != null) {
				for (var j=0; j<nextRow.planks.length; j++) {
					var jItem = nextRow.planks[j];
	
					if (jItem.stop < layoutResult.roomLengthWithDistance) {
						cuts.push(jItem.stop);
					}
				}
			}
	
			for (var j=0; j<iItem.planks.length; j++) {
				var jItem = iItem.planks[j];
				var valid = true;
	
				if (jItem.stop < layoutResult.roomLengthWithDistance && cuts.length > 0) {
					for (var k=0; k<cuts.length; k++) {
						var kItem = cuts[k];
						var diff = kItem - jItem.stop;
						
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
	}

	return isValid;
}

$(document).ready(function() {
	for (var i=0; i<domains.length; i++) {
		var iItem = domains[i];

		if (location.href.indexOf(iItem) == -1) {
			$("#domains").append($('<a href="https://' + iItem + '/">' + iItem + '</a>'));
		}
	}

	var reFix = /^\d+:\d+(,\d+:\d+)*$/i;

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

	if (query.d == "length" || query.d == "width") {
		$("#direction").val(query.d);
	}

	if (query.ac) {
		$("#autoCorrect").attr("checked", (query.ac == "true"));
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
				addFixHtml(pair[0], pair[1]);
			}
		}
	}
	
	$("#autoCorrect").change(function() {
		toggleErrorCorrection(!$(this).is(":checked"));
	}).trigger("change");
	
	$(document).on("keydown", ".fix-row, .fox-plank-length", function(e) {
		if (e.key == "Delete") {
			e.preventDefault();
			$(this).closest("div").find("button").trigger("click");
		}
	});

	setTimeout(function() {
		$("#calc").trigger("click");
	}, 100);
});