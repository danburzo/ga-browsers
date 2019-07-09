# ga-browsers

Upload a .CSV export from your Google Analytics account to explore your visitors' browser versions, visually.

[__Online Demo__](https://danburzo.github.io/ga-browsers)

## How do I get the .CSV file?

To get the analytics data in a form that can be used by this tool, you need to create a Custom Report with specific columns:

1. Go to <kbd>Google Analytics</kbd> → <kbd>Customization</kbd> → <kbd>Custom Reports</kbd>
2. Create a new custom report with the following characteristics:
	* __Type__: _Flat table_
	* __Dimensions__: _Browser_, _Operating System_, _Browser Version_
	* __Metrics__: _Users_
	* __Views__: your desired view
3. View the report, and at the bottom select _Show 5000 rows_ to get the most data
4. Export the report as `.csv`
