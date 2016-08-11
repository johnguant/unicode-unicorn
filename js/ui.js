global_colorMap = {};
// codepoints is an int array, 
// tableId a string to a <table class="table table-striped">
// and buttons is an array of {
//   displayName: "Display name",
//   functionName: "function name",
//   require: function(idx, length) -> bool
// }, where each function name refers to a function taking a codepoint and an index into `codepoints`
function renderCodepointsInTable(codepoints, tableId, buttons) {
	var table = $('#' + tableId);
	if (codepoints.length == 0) {
		table.html('');
		return;
	}
	var html = ('<thead>'
	    + '<tr><th></th><th>Codepoint (Hex)</th><th>Codepoint (Decimal)</th><th>Character</th><th>Category</th><th>Name</th></tr>'
	    + '</thead><tbody>');
	for (var i = 0; i < codepoints.length; ++i) {
		var codepoint = codepoints[i];
		var buttonStr = '';
		for (var j in buttons) {
			var buttonDescription = buttons[j];
			var disabled = '';
			if (buttonDescription.require) {
				if (!buttonDescription.require(i, codepoints.length)) {
					disabled = 'disabled ';
				}
			}
			buttonStr += '<input type="button" ' + disabled + 'onclick="' + buttonDescription.functionName + '(' + codepoint + ', ' + i + ')" value="'
			    + buttonDescription.displayName 
			    + '">';
		}
		html += '<tr>'
		    + '<td>' + buttonStr + '</td>'
		    + '<td>U+' + itos(codepoint, 16, 4) + '</td>'
		    + '<td>' + codepoint + '</td>'
		    + '<td>' + displayCodepoint(codepoint) + '</td>'
		    + '<td>' + getCharacterCategoryName(codepoint) + '</td>'
		    + '<td style="cursor: pointer;" onclick="showCodepageDetail(' + codepoint + ')">' + getHtmlNameDescription(codepoint) + '</td>'
		    + '</tr>';
	}
	if (i >= 256) {
		html += '<tr><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td></tr>';
	}
	html += '</tbody>';
	table.hide();
	table.html(html);
	table.show();
}

function randomColorForKey(key) {
	if (global_colorMap[key])
		return global_colorMap[key];
	var color = randomColor({
		luminosity: 'light'
	});
	global_colorMap[key] = color;
	return color;
}

function updateRenderedCodepage() {
	var encodingName = $('#codepageEncoding option:selected').text();
	var encoding = global_encodings[encodingName];
	var isAscii = encoding.type == '7-bit mapping';
	var html = '<thead><th></th>';
	for (var i = 0; i < 16; ++i)
		html += '<th>_' + i.toString(16).toUpperCase() + '</th>';
	html += '</thead><tbody>';
	for (var i = 0; i < (isAscii ? 8 : 16); ++i) {
		html += '<tr><td style="font-weight:bold">' + i.toString(16).toUpperCase() + '_</td>';
		for (var j = 0; j < 16; ++j) {
			var byte = (i << 4) + j;
			var codepoint = encoding.decode([byte])[0];
			var color = randomColorForKey(getCharacterCategoryName(codepoint));
			var displayedCodepoint = displayCodepoint(codepoint);
			if (displayedCodepoint) {
				html += '<td style="cursor: pointer; background-color: ' + color + ';" onclick="showCodepageDetail(' + codepoint + ')">' 
					+ i.toString(16).toUpperCase()
					+ j.toString(16).toUpperCase()
					+ '<br>'
					+ displayedCodepoint
					+ '</td>';
			} else {
				html += '<td style="background-color: white">' + i.toString(16).toUpperCase() + j.toString(16).toUpperCase() + '<br>&nbsp;</td>';
			}
		}
		html += '</tr>';
	}
	html += '</tbody>';
	$('#codepage').html(html);
}

function showCodepageDetail(codepoint) {
	$('#detail-codepoint-hex').text(itos(codepoint, 16, 4));
	$('#detail-codepoint-decimal').text(codepoint);
	$('#detail-name').html('"' + getName(codepoint) + '"');
	$('#detail-character').html(displayCodepoint(codepoint));
	$('#detail-character-raw').text(ctos([codepoint]));
	$('#detail-character-textbox').val(ctos([codepoint]));
	$('#detail-category').text(getCharacterCategoryCode(codepoint) + ' (' + getCharacterCategoryName(codepoint) + ')');
	$('#detail-block').text(getBlockForCodepoint(codepoint).replace(/_/g, ' '));
	$('#detail-script').text(getScriptForCodepoint(codepoint).replace(/_/g, ' '));
	var matchingAliases = [];
	for (var i = 0; i < global_aliases.length; ++i) {
		if (global_aliases[i].codepoint == codepoint)
			matchingAliases.push(global_aliases[i].alias);
	}
	if (matchingAliases.length == 0) {
		$('#detail-aliases').hide();
	} else {
		$('#detail-aliases').show();
		$('#detail-aliases-list').text(matchingAliases.join(', '));
	}
	var meaning = global_han_meanings[codepoint];
	if (meaning) {
		$('#detail-meaning').show();
		$('#detail-meaning-content').text(meaning);
	} else {
		$('#detail-meaning').hide();
	}
	var mandarin = global_mandarin_readings[codepoint];
	if (mandarin) {
		$('#detail-mandarin').show();
		$('#detail-mandarin-content').text(mandarin);
	} else {
		$('#detail-mandarin').hide();
	}
	var kun = global_kun_readings[codepoint];
	if (kun) {
		$('#detail-kun').show();
		$('#detail-kun-content').text(kun);
	} else {
		$('#detail-kun').hide();
	}
	var on = global_on_readings[codepoint];
	if (on) {
		$('#detail-on').show();
		$('#detail-on-content').text(on);
	} else {
		$('#detail-on').hide();
	}
	var variationSequences = variationSequencesForCodepoint(codepoint);
	if (variationSequences.length == 0) {
		$('#detail-variation-sequences').hide();
	} else {
		$('#detail-variation-sequences').show();
		var variationsString = '';
		for (var i = 0; i < variationSequences.length; ++i) {
			var vs = variationSequences[i];
			if (variationsString != '')
				variationsString += '<br>';
			variationsString +=
				'U+' + itos(vs.base, 16, 4) +
				' U+' + itos(vs.variationSelector, 16, 4) +
				': ' + escapeHtml(ctos([vs.base, vs.variationSelector]))
				+ ' <i>' + vs.description;
			if (vs.shapingEnvironments.length > 0)
				variationsString += ' (' + vs.shapingEnvironments.join(', ') + ')</i>';
			else
				variationsString += '</i>';
		}
		$('#detail-variation-sequences-content').html(variationsString);
	}

	var encodingsString = '';
	$('#outputEncoding option').each(function(i, e) {
		var encoding = $(e).text();
		var html = encodeOutput(
			$('#byteOrderMark option:selected').text(),
			encoding,
			$('#outputFormat option:selected').text(),
			$('#outputJoiner option:selected').text(),
			[codepoint]
		);
		if (html.startsWith('<span'))
			return;
		encodingsString += encoding + ': ' + html + '\n';
	});

	$('#detail-encoding-outputs').html(encodingsString);
	$('#codepoint-detail').modal('show');
}
