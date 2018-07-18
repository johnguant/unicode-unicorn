let global_variationSequences = [];
let global_ideographicVariationSequences = [];
let global_ideographicVariationCollections = [];
function initVariationSequences(completion) {
    requestAsync(`data/Unicode/UCD/StandardizedVariants.txt`, undefined, function (line) {
        const fields = line.split(`;`);
        const codepoints = fields[0].split(` `).map((str) => parseInt(str, 16));
        const description = fields[1].trim();
        let shapingEnvironments = fields[2].trim().split(` `);
        if (shapingEnvironments.length == 1 && shapingEnvironments[0] === ``)
            shapingEnvironments = [];
        global_variationSequences.push({
            baseCodepoint: codepoints[0],
            variationSelector: codepoints[1],
            description: description,
            shapingEnvironments: shapingEnvironments
        });
    }, completion);
}
function variationSequencesForCodepoint(codepoint) {
    const results = [];
    for (let i = 0; i < global_variationSequences.length; ++i) {
        if (global_variationSequences[i].baseCodepoint == codepoint)
            results.push(global_variationSequences[i]);
    }
    return results;
}
function initIdeographicVariationSequences(completion) {
    requestAsync(`data/Unicode/IVD/IVD_Sequences.txt`, undefined, function (line) {
        const fields = line.split(`;`);
        const codepoints = fields[0].split(` `).map((str) => parseInt(str, 16));
        const collection = fields[1].trim();
        const item = fields[2].trim();
        global_ideographicVariationSequences.push({
            baseCodepoint: codepoints[0],
            variationSelector: codepoints[1],
            description: `ideographic (entry ${item} in collection <a target="_blank" href="${urlForIdeographicCollection(collection)}">${collection}</a>)`
        });
    }, completion);
}
function urlForIdeographicCollection(name) {
    for (let i = 0; i < global_ideographicVariationCollections.length; ++i) {
        const collection = global_ideographicVariationCollections[i];
        if (collection.name != name)
            continue;
        return collection.url;
    }
}
function initIdeographicVariationCollections(completion) {
    requestAsync(`data/Unicode/IVD/IVD_Collections.txt`, undefined, function (line) {
        const fields = line.split(`;`);
        global_ideographicVariationCollections.push({
            name: fields[0],
            url: fields[2] // fields[1] is a regex describing item identifiers
        });
    }, completion);
}
function ideographicVariationSequencesForCodepoint(codepoint) {
    const results = [];
    for (let i = 0; i < global_ideographicVariationSequences.length; ++i) {
        if (global_ideographicVariationSequences[i].baseCodepoint == codepoint)
            results.push(global_ideographicVariationSequences[i]);
    }
    return results;
}