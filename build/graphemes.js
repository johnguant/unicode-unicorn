let global_graphemeBreakData = [];
let global_extendedPictograph = [];
function initGraphemeData(completion) {
    requestAsync(`data/Unicode/UCD/auxiliary/GraphemeBreakProperty.txt`, function () { }, function (line) {
        let state = 1;
        let startCodepoint = ``;
        let endCodepoint = ``;
        let value = ``;
        for (let j = 0; j < line.length; ++j) {
            const c = line[j];
            if (c == `#`)
                break;
            if (state == 1) {
                if (c != `.` && c != ` `) {
                    startCodepoint += c;
                    continue;
                }
                else {
                    state = 2;
                }
            }
            if (state == 2) {
                if (c == ` `) {
                    state = 3;
                }
                else if (c == `.`) {
                    continue;
                }
                else {
                    endCodepoint += c;
                    continue;
                }
            }
            if (state == 3) {
                if (c == ` `)
                    continue;
                else if (c == `;`) {
                    state = 4;
                    continue;
                }
            }
            if (state == 4) {
                if (c == ` `) {
                    continue;
                }
                else if ((c >= `a` && c <= `z`) || (c >= `A` && c <= `Z`) || c == `_`) {
                    value += c;
                    continue;
                }
                else
                    break;
            }
        }
        startCodepoint = parseInt(startCodepoint, 16);
        endCodepoint = endCodepoint === `` ? startCodepoint : parseInt(endCodepoint, 16);
        for (let x = startCodepoint; x <= endCodepoint; ++x) {
            global_graphemeBreakData[x] = value;
        }
    }, completion);
}
function initEmojiData(completion) {
    requestAsync(`data/Unicode/emoji-data.txt`, undefined, function (line) {
        const components = line.split(`;`);
        if (components.length != 2)
            return;
        if (components[1].trim() != `Extended_Pictographic`)
            return;
        if (components[0].includes(`..`)) {
            const arr = components[0].trim().split(`..`);
            const start = parseInt(arr[0], 16);
            const end = parseInt(arr[1], 16);
            for (let i = start; i <= end; ++i) {
                global_extendedPictograph.push(i);
            }
        }
        else {
            global_extendedPictograph.push(parseInt(components[0].trim(), 16));
        }
    }, completion);
}
function isExtendedPictographic(codepoint) {
    for (const i in global_extendedPictograph) {
        if (global_extendedPictograph[i] == codepoint) {
            return true;
        }
    }
    return false;
}
function graphemeBreakValueForCodepoint(codepoint) {
    if (global_graphemeBreakData[codepoint])
        return global_graphemeBreakData[codepoint];
    return `Other`;
}
// Updated for revision 33
function countGraphemesForCodepoints(codepoints, useExtended) {
    if (codepoints.length === 0)
        return 0;
    // for GB12 and GB13
    let numberOfContinuousRegionalIndicatorSymbols = 0;
    let value1OfGB11 = false; // true if and only if LHS matches \p{Extended_Pictographic} Extend*
    let breaks = 0;
    for (let i = 1; i < codepoints.length; ++i) {
        // increment `breaks` if we should break between codepoints[i-1] and codepoints[i]
        const value1 = graphemeBreakValueForCodepoint(codepoints[i - 1]);
        const value2 = graphemeBreakValueForCodepoint(codepoints[i]);
        // see http://unicode.org/reports/tr29/#Grapheme_Cluster_Boundary_Rules for descriptions of grapheme cluster boundary rules
        // skip rules GB1 and GB2 as they deal with SOT and EOT and thus don`t affect the number of graphemes in a string
        // Nontrivial rules:
        // handle value1 of GB12 and GB13
        //   GB12:     ^ (RI RI)* RI × ...
        //   GB13: [^RI] (RI RI)* RI × ...
        // they match if there is an odd number of Regional_Indicator codepoints on the left-hand side
        if (value1 == `Regional_Indicator`) {
            ++numberOfContinuousRegionalIndicatorSymbols;
        }
        else {
            numberOfContinuousRegionalIndicatorSymbols = 0;
        }
        if (value1 == `CR` && value2 == `LF`) { // GB3
        }
        else if (value1 == `Control` || value1 == `CR` || value1 == `LF`) { // GB4
            ++breaks;
        }
        else if (value2 == `Control` || value2 == `CR` || value2 == `LF`) { // GB5
            ++breaks;
        }
        else if (value1 == `L` && (value2 == `L` || value2 == `V` || value2 == `LV` || value2 == `LVT`)) { // GB6
        }
        else if ((value1 == `LV` || value1 == `V`) && (value2 == `V` || value2 == `T`)) { // GB7
        }
        else if ((value1 == `LVT` || value1 == `T`) && value2 == `T`) { // GB8
        }
        else if (value2 == `Extend` || value2 == `ZWJ`) { // GB9
        }
        else if (useExtended && value2 == `SpacingMark`) { // GB9a
        }
        else if (useExtended && value1 == `Prepend`) { // GB9b
        }
        else if (value1OfGB11 && value1 == `ZWJ` && isExtendedPictographic(codepoints[i])) { // GB11
        }
        else if (numberOfContinuousRegionalIndicatorSymbols % 2 == 1 && value2 == `Regional_Indicator`) { // GB12 and GB13
        }
        else { // GB999
            ++breaks;
        }
        // GB10 LHS: (E_Base | E_Base_GAZ) Extend* × ...
        if (isExtendedPictographic(codepoints[i - 1])) {
            value1OfGB11 = true;
        }
        else if (value1 == `Extend` && value1OfGB11 === true) {
            // do nothing
        }
        else {
            value1OfGB11 = false;
        }
    }
    return breaks + 1;
}