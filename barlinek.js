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

function calculate() {
	var result = $("#result").empty().append("<hr />").text("Calculating...");

	var cutDistance = 0;
	var direction = $("#direction").val();
	var plankLength = parseFloat($("#plankLength").val());
	var plankWidth = parseFloat($("#plankWidth").val());
	var packageSize = parseFloat($("#packageSize").val());
	var wallDistance = parseFloat($("#wallDistance").val());

	var roomLengthOrg = parseFloat($("#room" + (direction == "width" ? "Width" : "Length")).val());
	var roomWidthOrg = parseFloat($("#room" + (direction == "width" ? "Length" : "Width")).val());
	var roomLength = (roomLengthOrg * 1000) - (wallDistance * 2);
	var roomWidth = (roomWidthOrg * 1000) -  (wallDistance * 2);

	var rowsOrg = roomWidth / plankWidth;
	var rows = Math.ceil(rowsOrg);

	for (var i=rules.planks.length-1; i>=0; i--) {
		if (plankLength >= rules.planks[i].length) {
			cutDistance = rules.planks[i].cutDistance;
			break;
		}
	}

	var layout = [];
	var leftovers = 0;
	var trash = 0;
	var planksNeeded = 0;

	for (var i=0; i<rows; i++) {
		var rowLength = 0;

		layout.push({
			"row": i + 1,
			"width": (i + 1 == rows ? parseFloat(((rowsOrg - Math.floor(rowsOrg)) * plankWidth).toFixed(2)) : plankWidth),
			"planks": []
		});

		if (leftovers > 0) {
			if (leftovers >= rules.minStartLength) {
				layout[i].planks.push({
					"start": rowLength,
					"stop": rowLength + leftovers,
					"length": leftovers,
					"valid": false
				});
				rowLength += leftovers;
			} else {
				trash += leftovers;
			}

			leftovers = 0;
		}

		while (rowLength < roomLength) {
			if (rowLength + plankLength <= roomLength) {
				layout[i].planks.push({
					"start": rowLength,
					"stop": rowLength + plankLength,
					"length": plankLength,
					"valid": false
				});
				rowLength += plankLength;
			} else {
				var diff = roomLength - rowLength;

				if (layout[i].planks.length > 0 && diff < plankWidth && layout[i].planks[0].length - (plankWidth - diff) >= rules.minStartLength) {
					rowLength -= (plankWidth - diff);
					layout[i].planks[0].length -= (plankWidth - diff);

					$(layout[i].planks).each(function(j) {
						if (j > 0) {
							layout[i].planks[j].start -= (plankWidth - diff);
						}

						layout[i].planks[j].stop -= (plankWidth - diff);
					});

					diff = plankWidth;
				}

				layout[i].planks.push({
					"start": rowLength,
					"stop": rowLength + diff,
					"length": diff,
					"valid": false
				});
				rowLength += diff;

				leftovers = plankLength - diff;
			}

			planksNeeded++;
		}
	}

	var isValid = validate(roomLength, cutDistance, layout);

	if (!isValid) {
		var fixLayout = JSON.parse(JSON.stringify(layout));
		var tries = 0;
		var maxTries = 10;

		while (!isValid && tries < maxTries) {
			fixLayout = tryFixLayout(roomLength, plankLength, plankWidth, cutDistance, fixLayout);
			isValid = validate(roomLength, cutDistance, fixLayout);
			tries++
		}

		if (isValid) {
			layout = fixLayout;
		}
	}

	trash += leftovers;
	leftovers = 0;

	var packagesNeeded = Math.ceil(planksNeeded / packageSize);
	var planksUnused = (packagesNeeded * packageSize) - planksNeeded;

	result.empty().append("<hr />");

	result.append($('<div><b>Room area:</b> ' + parseFloat((roomLengthOrg * roomWidthOrg).toFixed(2)) + ' m<sup>2</sup></div>'));
	result.append($('<div><b>Minumum start length:</b> ' + rules.minStartLength + ' mm</div>'));
	result.append($('<div><b>Minumum end length:</b> ' + plankWidth + ' mm</div>'));
	result.append($('<div><b>Distance between cuts for nearby rows:</b> ' + cutDistance + ' mm</div>'));
	result.append($('<div><b>Rows:</b> ' + rows + '</div>'));
	result.append($('<div><b>Width of last row:</b> ' + layout[layout.length - 1].width + ' mm</div>'));
	result.append($('<div><b>Planks needed:</b> ' + planksNeeded + '</div>'));
	result.append($('<div><b>Packages needed:</b> ' + packagesNeeded + '</div>'));
	result.append($('<div><b>Planks unused:</b> ' + planksUnused + '</div>'));
	result.append($('<div><b>Trash:</b> ' + (trash/1000) + ' meters</div>'));
	result.append($('<div>&nbsp;</div>'));
	result.append($('<div class="text-end"><button class="btn btn-primary" onclick="link();" type="button">Copy direct link</button></div>'));
	result.append($('<div>&nbsp;</div>'));

	var planks = $('<div id="planks"></div>');
	var table = $('<div id="table"></div>');

	$(layout).each(function(i) {
		var row = $('<div class="row"></div>');
		var row2 = $('<div><b>Row ' + (i + 1) + ':</b></div>');

		$(this.planks).each(function(j) {
			var percentage = (this.length / roomLength) * 100;
			row.append($('<div class="' + (this.valid ? "text-bg-secondary" : "text-bg-warning") + ' border" title="' + this.length + ' mm"><span>' + this.length + ' mm</span></div>').width(percentage + "%"))
			row2.append($('<span>' + this.length + ' mm</span>'));
		});

		row2.append($('<span>(width: ' + this.width + ' mm)</span>'));

		planks.append(row);
		table.append(row2);
	});

	result.append(planks);
	result.append($('<div>&nbsp;</div>'));
	result.append($('<div class="text-end"><button class="btn btn-primary" onclick="link();" type="button">Copy direct link</button></div>'));
	result.append($('<div>&nbsp;</div>'));
	result.append(table);

	return false;
}

function link() {
	var roomLength = $("#roomLength").val();
	var roomWidth = $("#roomWidth").val();
	var plankLength = $("#plankLength").val();
	var plankWidth = $("#plankWidth").val();
	var packageSize = $("#packageSize").val();
	var wallDistance = $("#wallDistance").val();
	var direction = $("#direction").val();

	var url = location.href.split("?")[0];
	url += "?rl=" + roomLength;
	url += "&rw=" + roomWidth;
	url += "&pl=" + plankLength;
	url += "&pw=" + plankWidth;
	url += "&ps=" + packageSize;
	url += "&wd=" + wallDistance;
	url += "&d=" + direction;

	navigator.clipboard.writeText(url);
	alert("Copied to clipboard!");
}

function parseQuery(queryString) {
	var query = {};
	var pairs = (queryString[0] === "?" ? queryString.substr(1) : queryString).split("&");

	for (var i = 0; i < pairs.length; i++) {
		var pair = pairs[i].split("=");
		query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
	}

	return query;
}

function tryFixLayout(roomLength, plankLength, plankWidth, cutDistance, oldLayout) {
	var layout = JSON.parse(JSON.stringify(oldLayout));

	$(layout).each(function(i) {
		var doBreak = false;

		if (this.planks.length > 1) {
			$(this.planks).each(function(j) {
				if (!this.valid && this.start == 0 || this.stop == roomLength) {
					var diff = 0;

					if (this.prevDiffs.length > 0) {
						diff = this.prevDiffs[0];
					} else if (this.nextDiffs.length > 0) {
						diff = this.nextDiffs[0];
					}

					if (diff < 0) {
						diff *= -1;
						var fix = cutDistance - diff;

						if (this.start == 0 && (layout[i].planks[layout[i].planks.length - 1].length + fix) <= plankLength && (this.length - fix) > rules.minStartLength) {
							this.stop -= fix;
							this.length -= fix;

							$(layout[i].planks).each(function(x) {
								if (x > 0) {
									this.start -= fix;

									if (x < (layout[i].planks.length - 1)) {
										this.stop -= fix;
									} else {
										this.stop += fix;
										this.length += fix;
									}
								}
							});
						} else if (this.stop == roomLength && (this.length - fix) > rules.minStartLength) {
							this.stop -= fix;
							this.length -= fix;
						}
					} else if (diff > 0) {
						var fix = cutDistance - diff;

						if (this.start == 0 && (layout[i].planks[layout[i].planks.length - 1].length - fix) >= plankWidth && (this.length + fix) <= plankLength) {
							this.stop += fix;
							this.length += fix;

							$(layout[i].planks).each(function(x) {
								if (x > 0) {
									this.start += fix;

									if (x < (layout[i].planks.length - 1)) {
										this.stop += fix;
									} else {
										this.stop -= fix;
										this.length -= fix;
									}
								}
							});
						} else if (this.stop == roomLength && (this.length + fix) <= plankLength) {
							this.stop += fix;
							this.length += fix;
						}
					}
				}

				if (doBreak) {
					return false;
				}
			});
		}

		if (doBreak) {
			return false;
		}
	});

	return layout;
}

function validate(roomLength, cutDistance, layout) {
	var isValid = true;

	$(layout).each(function(i) {
		var prevRow = layout[i - 1];
		var nextRow = layout[i + 1];
		var prevCuts = [];
		var nextCuts = [];

		if (prevRow != null) {
			$(prevRow.planks).each(function(x) {
				if (this.stop < roomLength) {
					prevCuts.push(this.stop);
				}
			});
		}

		if (nextRow != null) {
			$(nextRow.planks).each(function(x) {
				if (this.stop < roomLength) {
					nextCuts.push(this.stop);
				}
			});
		}

		$(this.planks).each(function(j) {
			var validCount = 0;
			this.prevDiffs = [];
			this.nextDiffs = [];

			if (this.stop < roomLength && prevCuts.length > 0) {
				var validCuts = 0;

				$(prevCuts).each(function() {
					var diff = layout[i].planks[j].stop - this;

					if (diff >= cutDistance || diff <= -cutDistance) {
						validCuts++;
					} else {
						layout[i].planks[j].prevDiffs.push(diff);
					}
				});

				if (validCuts == prevCuts.length) {
					validCount++;
				}
			} else {
				validCount++;
			}

			if (this.stop < roomLength && nextCuts.length > 0) {
				var validCuts = 0;

				$(nextCuts).each(function() {
					var diff = layout[i].planks[j].stop - this;

					if (diff >= cutDistance || diff <= -cutDistance) {
						validCuts++;
					} else {
						layout[i].planks[j].nextDiffs.push(diff);
					}
				});

				if (validCuts == nextCuts.length) {
					validCount++;
				}
			} else {
				validCount++;
			}

			this.valid = (validCount == 2);

			if (!this.valid) {
				isValid = false;
			}
		});
	});

	return isValid;
}

$(document).ready(function() {
	$(domains).each(function() {
		if (location.href.indexOf(this) == -1) {
			$("#domains").append($('<a href="https://' + this + '/">' + this + '</a>'));
		}
	});

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

	$("#calc").trigger("click");
});