function jQueryModal(sel, operation) {
    $(sel).modal(operation);
}
var global_useInternalString = false;
var global_internalString = [];
var global_event_listeners = [{
        tabId: 'settings',
        elementId: 'output',
        f: updateUseInternalString
    }, {
        tabId: 'mojibake',
        elementId: 'output',
        f: updateMojibake
    }, {
        tabId: 'codepages',
        elementId: 'output',
        f: updateRenderedCodepage
    }, {
        tabId: 'stats',
        elementId: 'output',
        f: updateEncodedLengths
    }, {
        tabId: 'codepoints',
        elementId: 'output',
        f: updateCodepointList
    }, {
        tabId: 'encode',
        elementId: 'output',
        f: updateEncodedAndDecodedStrings
    }, {
        tabId: 'settings',
        elementId: 'output',
        f: updateLanguage
    }];
function callEventListenersForElemId(elemId) {
    for (var i = 0; i < global_event_listeners.length; ++i) {
        var listener = global_event_listeners[i];
        if (listener.elementId != elemId)
            continue;
        if (listener.tabId) {
            if (!$('#' + listener.tabId).hasClass('active'))
                continue;
        }
        listener.f();
    }
}
function getStr() {
    return global_useInternalString ? global_internalString : stoc($('#output').val());
}
function setStr(str) {
    global_internalString = str;
    $('#output').val(ctos(str));
}
function output(codepoint) {
    setStr(getStr().concat([codepoint]));
    updateInfo();
}
var clusterize = null;
function updateSuggestions() {
    var input = $('#input').val();
    var codepoints = searchCodepoints(input);
    var markup = [];
    var buttons = [{ displayName: 'Insert', functionName: 'output' }];
    for (var i = 0; i < codepoints.length; ++i) {
        var codepoint = codepoints[i];
        var buttonStr = '';
        for (var j in buttons) {
            var buttonDescription = buttons[j];
            var disabled = '';
            /*if (buttonDescription.require) {
                if (!buttonDescription.require(i, codepoints.length)) {
                    disabled = 'disabled ';
                }
            }*/
            buttonStr += '<input type="button" ' + disabled + 'onclick="' + buttonDescription.functionName + '(' + codepoint + ', ' + i + ')" value="' +
                buttonDescription.displayName +
                '">';
        }
        markup.push('<tr>' +
            '<td>' + buttonStr + '</td>' +
            '<td>U+' + itos(codepoint, 16, 4) + '</td>' +
            '<td>' + codepoint + '</td>' +
            '<td>' + displayCodepoint(codepoint) + '</td>' +
            '<td>' + getCharacterCategoryName(codepoint) + '</td>' +
            '<td style="cursor: pointer;" onclick="showCodepageDetail(' + codepoint + ')">' + getHtmlNameDescription(codepoint) + '</td>' +
            '</tr>');
    }
    if (!clusterize) {
        $('.clusterize-no-data').each(function (i, e) { e.parentNode.removeChild(e); });
        clusterize = new Clusterize({
            rows: markup,
            scrollId: 'scrollArea',
            contentId: 'contentArea',
            show_no_data_row: false
        });
    }
    else {
        clusterize.update(markup);
        $('.clusterize-no-data').each(function (i, e) { e.parentNode.removeChild(e); });
    }
    /*renderCodepointsInTable(
        results,
        'searchResults',
        [{displayName: 'Insert', functionName: 'output'}]
    );*/
}
function normalizeString(form) {
    if (!String.prototype.normalize) {
        alert('Your browser currently does not support string normalization.');
        return;
    }
    setStr(stoc(ctos(getStr()).normalize(form)));
    updateInfo();
}
function updateInfo() {
    var codepoints = getStr();
    setStr(codepoints);
    callEventListenersForElemId('output');
    var url = location.href.indexOf('?') == -1
        ? location.href
        : location.href.substring(0, location.href.indexOf('?'));
    if (codepoints.length > 0)
        url += '?c=' + codepoints.join(',');
    history.replaceState({}, '', url);
}
function deleteAtIndex(codepoint, index) {
    var codepoints = getStr();
    codepoints.splice(index, 1);
    setStr(codepoints);
    updateInfo();
}
function moveUp(codepoint, index) {
    var codepoints = getStr();
    var c = codepoints[index];
    codepoints[index] = codepoints[index - 1];
    codepoints[index - 1] = c;
    setStr(codepoints);
    updateInfo();
}
function moveDown(codepoint, index) {
    var codepoints = getStr();
    var c = codepoints[index];
    codepoints[index] = codepoints[index + 1];
    codepoints[index + 1] = c;
    setStr(codepoints);
    updateInfo();
}
function initData(completion) {
    loadUnicodeData(function () {
        callMultipleAsync([
            initializeMappings,
            initHanData,
            initGraphemeData,
            initUnicodeData,
            initGeneralCategoryNames,
            initAliasData,
            initBlockData,
            initHangulSyllableTypes,
            initShortJamoNames,
            initScriptData,
            initLicenseInfo,
            initLanguageData,
            initVariationSequences,
            initIdeographicVariationSequences], function () {
            deleteUnicodeData();
            completion();
        });
    });
}
function updateSpacerHeights() {
    for (var i = 0; i < $('.clusterize-scroll').length; ++i) {
        $('.clusterize-scroll')[i].style.maxHeight = $(window).height() - $($('.clusterize-scroll')[i]).position().top - 15 + 'px';
    }
    $('.fixed').each(function (i, e) {
        var spacerId = $(e).attr('data-spacer-id');
        var spacer = $('#' + spacerId);
        if (spacer.attr('data-extra-height'))
            var extraHeight = parseFloat($(spacer).attr('data-extra-height'));
        else
            var extraHeight = 0;
        spacer.height($(e).height() + extraHeight);
    });
}
var loaded = false;
jQueryModal('#loadingModal', 'show');
$(document).ready(function () {
    if (loaded)
        return;
    loaded = true;
    $('select').chosen({ disable_search_threshold: 10, width: '50%' });
    updateSpacerHeights();
    var startTime = new Date();
    initData(function () {
        initializeSearchStrings();
        window.onpopstate = function () {
            var args = location.search.substring(1).split('&');
            for (var i = 0; i < args.length; ++i) {
                var arg = args[i].split('=');
                if (arg[0] == 'c') {
                    setStr(arg[1].split(',').map(function (str) { return parseInt(str); }));
                }
                else if (arg[0] == 'info') {
                    showCodepageDetail(parseInt(arg[1]));
                }
            }
        };
        window.onpopstate(null);
        var loadDuration = new Date() - startTime; // in ms
        updateInfo();
        updateSuggestions();
        $('#input').on('keyup', function (e) {
            if (e.keyCode == 13) {
                var input = $('#input').val();
                if (isNaN(parseInt(input.replace('U+', ''), 16))) {
                    document.body.style.backgroundColor = '#fdd';
                    setTimeout(function () {
                        document.body.style.backgroundColor = '#fff';
                    }, 1000);
                }
                else {
                    output(parseInt(input.replace('U+', ''), 16));
                    $('#input').val('');
                }
            }
        });
        $('#input').on('input', function (e) {
            updateSuggestions();
        });
        $('#output, #encodedInput').on('input', function () {
            updateInfo();
        });
        $('select').on('change', function () {
            updateInfo();
        });
        setInterval(function () {
            updateSpacerHeights();
        }, 1000);
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            updateSpacerHeights();
            callEventListenersForElemId('output');
        });
        jQueryModal('#loadingModal', 'hide');
        console.log('Loaded in ' + loadDuration + 'ms');
    });
});
