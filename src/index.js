import { csvParse } from 'd3-dsv';
import { group } from 'd3-array';

const DEFAULT_THRESHOLD = 95;
const KEY_VENDOR = 'Browser';
const KEY_OS = 'Operating system';
const KEY_VERSION = 'Browser version';
const KEY_COUNT = 'Total users';

const dropzone = document.querySelector('.dropzone');
const thresholdSlider = document.querySelector('#threshold');
const thresholdOutput = document.querySelector('#threshold-output');
const sorting = document.querySelector('#sorting');
const browsersEl = document.querySelector('#browsers');

const process = text => {
	const block = text.split('\n').filter(line => line && !line.match(/^\#/)).join('\n');
	return aggregate(csvParse(block).filter(item => item['Browser']));
}

const browser_rules = {
	'Safari': {
		dot_version: true,
		platforms: {
			'iOS': 'Safari iOS',
			'__default__': 'Safari Mac'
		}
	}
};

const aggregate = contents => Array.from(
		group(
			contents, 
			item => {
				let name = item[KEY_VENDOR];
				let platform = item[KEY_OS];
				return (
					browser_rules[name] &&
					browser_rules[name].platforms ? 
						(
							browser_rules[name].platforms[platform] ||
							browser_rules[name].platforms.__default__
						) : name
				);
			}, 
			item => {
				let name = item[KEY_VENDOR];
				let str = item[KEY_VERSION];
				if (browser_rules[name] && browser_rules[name].dot_version) {
					return str.split('.').slice(0, 2).join('.');
				} else {
					return str.split('.')[0];
				}
			}
		)
	).map(
		([name, vers]) => {

			let versions = Array.from(vers)
				.map(
					([version, items]) => ({
						version,
						users: items.reduce((acc, curr) => acc + parseFloat(curr[KEY_COUNT].replace(/\,/g, '')), 0)
					})
				)
				.sort((a, b) => {
					return parseFloat(b.version) - parseFloat(a.version);
				});

			return {
				name,
				versions
			}
		}
	);

let contents = null;


if (dropzone) {
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		const file = e.dataTransfer.files.item(0);
		const reader = new FileReader();
		reader.onload = e => {
			contents = process(e.target.result);
			showui();
			rerender();
		};
		reader.readAsText(file);
	});
	dropzone.addEventListener('dragover', e => {
		e.preventDefault();
	});
}

function rerender() {
	thresholdOutput.textContent = +thresholdSlider.value;
	const [browsers, total] = display(contents, +thresholdSlider.value, sorting.value);
	browsersEl.innerHTML = browsers.map(
		(item,idx) => `<li>${item[0]} ${item[1].version} (${(item[1].users/total * 100).toFixed(2)}%)</li>`
	).join('');
}

function showui() {
	document.querySelector('#controls').style.display = '';
}

thresholdSlider.value = DEFAULT_THRESHOLD;
sorting.value = 'usage';

thresholdSlider.addEventListener('input', rerender);
sorting.addEventListener('change', rerender);

function display(contents, threshold, sorting) {
	console.log(contents);
	let browsers = [];
	let candidates = contents
		.reduce(
			(res, browser) => res.concat(
				browser.versions.map(v => [browser.name, v])
			)
		, [])
		.sort((a, b) => b[1].users - a[1].users);
	let total = candidates.reduce((acc, curr) => curr[1].users + acc, 0);
	let limit = total * threshold / 100;
	let coverage = 0;
	let i = 0;
	while (coverage < limit && i < candidates.length) {
		browsers.push(candidates[i]);
		coverage += candidates[i][1].users;
		i++;
	}
	if (sorting === 'name') {
		browsers.sort((a, b) => {
			if (a[0] > b[0]) return 1;
			if (a[0] < b[0]) return -1;
			if (+a[1].version > +b[1].version) return -1;
			if (+a[1].version < +b[1].version) return 1;
			return 0;
		});
	}
	return [browsers, total];
}