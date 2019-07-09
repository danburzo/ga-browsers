import { useState, useEffect, useCallback } from 'react';

import { stack, stackOffsetDiverging } from 'd3-shape';
import { csvParse } from 'd3-dsv';
import { group, min, max, range, zip } from 'd3-array';
import { scaleLinear, scaleBand } from 'd3-scale';

import './index.css';

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
				let name = item['Browser'];
				let platform = item['Operating System'];
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
				let name = item['Browser'];
				let str = item['Browser Version'];
				if (browser_rules[name] && browser_rules[name].dot_version) {
					return str.split('.').slice(0, 2).join('.');
				} else {
					return str.split('.')[0];
				}
			}
		)
	).map(
		([name, vers]) => {

			console.log(name);

			let versions = Array.from(vers)
				.map(
					([version, items]) => ({
						version,
						users: items.reduce((acc, curr) => acc + parseFloat(curr.Users.replace(/\,/g, '')), 0)
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

const Chart = ({ contents }) => {

	return (
		<div className='chart'>
			{ contents.map((browser, idx) => 
				<div key={idx}>
					<h2>{browser.name}</h2>
					<ul>
						{ browser.versions.map((v, idx) => 
							<li key={idx}>{v.version}: {v.users}</li>
						)}
					</ul>
				</div>
			)}
		</div>
	);
}

const Home = () => {

	let [contents, setContents] = useState(null);
	let [threshold, setTreshold] = useState(90);

	let onDrop = useCallback(e => {
		e.preventDefault();

		const file = e.dataTransfer.files.item(0);
		const reader = new FileReader();
		reader.onload = e => {
			setContents(process(e.target.result));
		};
		reader.readAsText(file);

	}, []);


	let onDragOver = useCallback(e => {
		e.preventDefault();
	}, []);

	let browsers = [];
	if (contents && threshold) {
		let candidates = contents
			.reduce(
				(res, browser) => res.concat(
					browser.versions.map(v => [browser.name, v])
				)
			, [])
			.sort((a, b) => b[1].users - a[1].users);
		let total = candidates.reduce((acc, curr) => curr[1].users + acc, 0);
		let limit = total * parseFloat(threshold) / 100;
		let coverage = 0;
		let i = 0;
		while (coverage < limit && i < candidates.length) {
			browsers.push(candidates[i]);
			coverage += candidates[i][1].users;
			i++;
		}
	} else {
		browsers = null;
	}

	return (
		<div>
			<div className='dropzone' onDrop={onDrop} onDragOver={onDragOver}>
				Drop .csv here
			</div>
			<div className='slider'>
				<label>Support <input type='range' value={threshold} min='0' max='100' step='0.25' onChange={e => setTreshold(e.target.value)} /> {threshold}% of visitors</label>
			</div>
			{browsers && (<ul className='target-browsers'>
				{browsers.map((item,idx) => <li key={idx}>{item[0]} {item[1].version}</li>)}
			</ul>)}
			{ contents && <Chart contents={contents}/> }
		</div>
	);
};

export default Home;
