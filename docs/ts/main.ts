interface ModalJQuery {
	modal(operation: string): void;
}
function jQueryModal(sel: string, operation: string) {
	(<ModalJQuery> <any> $(sel)).modal(operation);
}

let global_useInternalString = false;
let global_internalString: number[] = [];

interface TextListener {
	tabId?: string,
	elementId: string,
	f: () => void
}
let global_event_listeners: TextListener[] = [{
	tabId: `settings`,
	elementId: `output`,
	f: updateUseInternalString
}, {
	tabId: `mojibake`,
	elementId: `output`,
	f: updateMojibake
}, {
	tabId: `codepages`,
	elementId: `output`,
	f: updateRenderedCodepage
}, {
	tabId: `stats`,
	elementId: `output`,
	f: updateEncodedLengths
}, {
	tabId: `codepoints`,
	elementId: `output`,
	f: updateCodepointList
}, {
	tabId: `encode`,
	elementId: `output`,
	f: updateEncodedAndDecodedStrings
}, {
	tabId: `settings`,
	elementId: `output`,
	f: updateLanguage
}];

function callEventListenersForElemId(elemId: string) {
	for (let i = 0; i < global_event_listeners.length; ++i) {
		const listener = global_event_listeners[i];
		if (listener.elementId != elemId)
			continue;
		if (listener.tabId) {
			if (!$(`#${listener.tabId}`).hasClass(`active`))
				continue;
		}
		listener.f();
	}
}

function getStr() {
	return global_useInternalString ? global_internalString : stoc($(`#output`).val());
}

function setStr(str: number[]) {
	global_internalString = str;
	$(`#output`).val(ctos(str));
}

function output(codepoint: number) {
	setStr(getStr().concat([codepoint]));
	updateInfo();
}

function updateSuggestions() {
	const input = $(`#input`).val();
	const results = searchCodepoints(input);
	renderCodepointsInTable(
		results,
		`searchResults`,
		[{displayName: `Insert`, functionName: `output`}]
	);
}

function normalizeString(form: string) {
	setStr(stoc(ctos(getStr()).normalize(form)));
	updateInfo();
}

function updateInfo() {
	const codepoints = getStr();
	setStr(codepoints);

	callEventListenersForElemId(`output`);

	let url = location.href.indexOf(`?`) == -1
		? location.href
		: location.href.substring(0, location.href.indexOf(`?`));
	if (codepoints.length > 0) {
		url += `?c=${codepoints.join(`,`)}`;
	}
	history.replaceState({}, ``, url);
}

function deleteAtIndex(codepoint: number, index: number) {
	const codepoints = getStr();
	codepoints.splice(index, 1);
	setStr(codepoints);
	updateInfo();
}

function moveUp(codepoint: number, index: number) {
	const codepoints = getStr();
	const c = codepoints[index];
	codepoints[index] = codepoints[index-1];
	codepoints[index-1] = c;
	setStr(codepoints);
	updateInfo();
}

function moveDown(codepoint: number, index: number) {
	const codepoints = getStr();
	const c = codepoints[index];
	codepoints[index] = codepoints[index+1];
	codepoints[index+1] = c;
	setStr(codepoints);
	updateInfo();
}

function initData(completion: () => void) {
	callMultipleAsync([
		initializeMappings,
		initBlockData,
		initLanguageData], completion);
}

let loaded = false;
$(document).ready(function() {
	if (loaded)
		return;
	loaded = true;
	(<any> $(`select`)).chosen({ disable_search_threshold: 10, width: `100%` });
	const startTime = new Date();
	initData(function() {
		initializeSearchStrings();
		window.onpopstate = function() {
			const args = location.search.substring(1).split(`&`);
			for (let i = 0; i < args.length; ++i) {
				const arg = args[i].split(`=`);
				if (arg[0] == `c`) {
					setStr(arg[1].split(`,`).map((str) => parseInt(str)));
				} else if (arg[0] == `info`) {
					showCodepageDetail(parseInt(arg[1]));
				}
			}
		};
		window.onpopstate(new PopStateEvent(``));
		const loadDuration = <any> new Date() - <any> startTime; // in ms
		updateInfo();
		updateSuggestions();
		$(`#input`).on(`keyup`, function(e) {
			if (e.keyCode == 13) {
				const input = $(`#input`).val();
				if (isNaN(parseInt(input.replace(`U+`, ``), 16))) {
					document.body.style.backgroundColor = `#fdd`;
					setTimeout(function() {
						document.body.style.backgroundColor = `#fff`;
					}, 1000);
				} else {
					output(parseInt(input.replace(`U+`, ``), 16));
					$(`#input`).val(``);
				}
			}
		});
		$(`#input`).on(`input`, function(e) {
			updateSuggestions();
		});
		$(`#searchBlock`).on(`change`, function(e) {
			updateSuggestions();
		});
		$(`#output, #encodedInput`).on(`input`, function() {
			updateInfo();
		});
		$(`#minCodeUnitLength`).on(`input`, function() {
			updateInfo();
		});
		$(`select`).on(`change`, function() {
			updateInfo();
		});
		$(`a[data-toggle="tab"]`).on(`shown.bs.tab`, function(e) {
			callEventListenersForElemId(`output`);
		});
		// This should be on `input` instead, but this doesn't fire on
		//  Safari. See https://caniuse.com/#feat=input-event (#4)
		//  and specifically https://bugs.webkit.org/show_bug.cgi?id=149398
		$(`#useInternalString`).on(`change`, function() {
			updateUseInternalString();
		});
		$(`#languageCode`).on(`input`, function() {
			updateLanguage();
		});
		console.log(`Loaded in ${loadDuration}ms`);
	});
});