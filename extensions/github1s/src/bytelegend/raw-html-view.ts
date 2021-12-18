import * as vscode from 'vscode';

export function createRawHtmlWebview(html: string) {
	const panel = vscode.window.createWebviewPanel(
		'RawHtmlWebview',
		'README',
		vscode.ViewColumn.Active,
		{
			enableScripts: true,
		}
	);
	panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>README</title>
</head>
<body>
${html}
</body>
</html>
		`;
}
