import { Fragment, useState, useEffect, useCallback } from 'react';

import { stack, stackOffsetDiverging } from 'd3-shape';
import { csvParse } from 'd3-dsv';
import { group, min, max, range, zip } from 'd3-array';
import { scaleLinear, scaleBand } from 'd3-scale';

import './index.css';

const DEFAULT_THRESHOLD = 95;

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
	let [threshold, setTreshold] = useState(DEFAULT_THRESHOLD);
	let [sort, setSort] = useState('usage');

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
		if (sort === 'name') {
			browsers.sort((a, b) => {
				if (a[0] > b[0]) return 1;
				if (a[0] < b[0]) return -1;
				if (a[1].version > b[1].version) return -1;
				if (a[1].version < b[1].version) return 1;
				return 0;
			});
		}
	} else {
		browsers = null;
	}

	return (
		<Fragment>

			<header>
				<h1>Explore browser versions from analytics data</h1>
				<nav>By <a href='https://twitter.com/danburzo'>@danburzo</a> — <a href=''>Source code</a></nav>	 
			</header>

			<p className='dropzone' onDrop={onDrop} onDragOver={onDragOver}>
				<strong>Drop a Google Analytics <code>.csv</code> in this box.</strong> (<a href='https://github.com/danburzo/ga-browsers'>How do I make one?</a>)
			</p>
			{ contents && 
				<div className='slider'>
					List browsers for <input type='range' value={threshold} min='0' max='100' step='0.25' onChange={e => setTreshold(e.target.value)} /> {threshold}% of visitors and sort by {' '}
					<select value={sort} onChange={ e => setSort(e.target.value)}>
						<option value='usage'>usage</option>
						<option value='name'>name</option>
					</select>
				</div>
			}
			{browsers && (<ul className='target-browsers'>
				{browsers.map((item,idx) => <li key={idx}>{item[0]} {item[1].version}</li>)}
			</ul>)}
			{ contents && <Chart contents={contents}/> }
		</Fragment>
	);
};

export default Home;
