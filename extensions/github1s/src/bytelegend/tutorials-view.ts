import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { getNonce, getWebviewOptions } from '@/helpers/util';
import { ByteLegendContext } from '@/bytelegend/bytelegendContext';
import { Tutorial } from './entities';

export class TutorialsView implements vscode.WebviewViewProvider {
	public static readonly viewId = 'bytelegend.views.tutorials';
	private readonly _extensionContext: vscode.ExtensionContext;
	private _webviewView: vscode.WebviewView;

	constructor(private readonly bytelegendContext: ByteLegendContext) {
		this._extensionContext = getExtensionContext();
	}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext<unknown>,
		token: vscode.CancellationToken
	): void | Thenable<void> {
		this._webviewView = webviewView;
		webviewView.webview.options = getWebviewOptions(
			this._extensionContext.extensionUri
		);
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
		webviewView.webview.onDidReceiveMessage((data) => {
			if (data.type === 'open.tutorial') {
				TutorialsView.openTutorial(data.tutorial as Tutorial);
			}
		});
	}

	private static openTutorial(tutorial: Tutorial) {
		if (tutorial.type.startsWith('text/')) {
			vscode.commands.executeCommand(
				'bytelegend.open',
				tutorial.href.replace('https://', 'github1s://')
			);
		} else if (tutorial.type.startsWith('video/')) {
			vscode.commands.executeCommand('bytelegend.openVideoTutorial', tutorial);
		}
	}

	_getHtmlForWebview(webview): string {
		const nonce = getNonce();

		const ret = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src *  data: blob: 'unsafe-inline'; style-src 'self' 'unsafe-inline'; script-src 'nonce-${nonce}'; frame-src youtube.com www.youtube.com; img-src 'self' data:;">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Tutorials</title>
	<style>
html {
	box-sizing: border-box;
	font-size: 13px;
}

*,
*:before,
*:after {
	box-sizing: inherit;
}

body, h1, h2, h3, h4, h5, h6, p, ol, ul {
	margin: 0;
	padding: 0;
	font-weight: normal;
}

body {
	background-color: transparent;
}

input {
	display: block;
	width: 100%;
	height: 24px;
	border: none;
	margin-bottom: 10px;
	padding-left: 4px;
	padding-right: 4px;
	font-family: var(--vscode-font-family);
	color: var(--vscode-input-foreground);
	outline-color: var(--vscode-input-border);
	background-color: var(--vscode-input-background);
}

button {
	border: none;
	width: 80%;
	height: 26px;
	margin-bottom: 5px;
	margin-top: 5px;
	padding: var(--input-padding-vertical) var(--input-padding-horizontal);
	text-align: center;
	outline: 1px solid transparent;
	outline-offset: 2px !important;
	color: var(--vscode-button-foreground);
	background: var(--vscode-button-background);
}

button:hover {
	cursor: pointer;
	background: var(--vscode-button-hoverBackground);
}

button:focus {
	outline-color: var(--vscode-focusBorder);
}

button.secondary {
	color: var(--vscode-button-secondaryForeground);
	background: var(--vscode-button-secondaryBackground);
}

button.secondary:hover {
	background: var(--vscode-button-secondaryHoverBackground);
}

.loading-page {
	width: 50px;
	height: 40px;
	margin: 60px auto;
	display: block;
	text-align: center;
}

.loading-page span {
	width: 5px;
	height: 100%;
	margin-right: 4px;
	display: inline-block;
	background:#2b6298;
	animation: loading 1.2s infinite ease-in-out;
	-webkit-animation: loading 1.2s infinite ease-in-out;
}

.loading-page >span:nth-child(2) {
	-webkit-animation-delay: -1.0s;
	animation-delay: -1.0s;
}

.loading-page >span:nth-child(3) {
	-webkit-animation-delay: -0.9s;
	animation-delay: -0.9s;
}

.loading-page >span:nth-child(4) {
	-webkit-animation-delay: -0.8s;
	animation-delay: -0.8s;
}

.loading-page >span:nth-child(5) {
	-webkit-animation-delay: -0.7s;
	animation-delay: -0.7s;
}

@keyframes loading {
	0% { transform: scaleY(0.4); }
	25% { transform: scaleY(1.0); }
	50% { transform: scaleY(0.4); }
	75% { transform: scaleY(0.4); }
	100% { transform: scaleY(0.4); }
}

.error-container {
	color: red;
	display: none;
}

.tutorials-container {
	display: none;
}
.tutorials-container div {
	text-align: center;
	margin-top: 64px;
}

.tutorials-container li img{
	width: 16px;
	height: 16px;
	margin-right: 8px;
}

.tutorials-container li.selected {
	background-color: #2b6298;
}

.tutorials-container li:hover {
	background-color: #2b6298;
}

.tutorials-container li {
	display: flex;
	align-items: center;
	cursor: pointer;
	padding: .75rem .75rem;
	color: white;
	border: 1px solid rgba(255,255,255,.125);
}

	</style>
</head>
<body>
	<div class="loading-page">
		<span></span><span></span><span></span><span></span><span></span>
	</div>
	<div class="error-container"></div>
	<div class="tutorials-container"></div>

	<script nonce="${nonce}">
	const textIcon = 'data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTg4Ni42MjQgMjk3LjM3Nkw2OTQuNjU2IDEwNS40MDhjLTIuOTQ0LTIuOTQ0LTYuNDMyLTUuMzEyLTEwLjMzNi02LjkxMkEzMS41MSAzMS41MSAwIDAgMCA2NzIgOTZIMjI0Yy01Mi45MjggMC05NiA0My4wNzItOTYgOTZ2NjQwYzAgNTIuOTI4IDQzLjA3MiA5NiA5NiA5Nmg1NzZjNTIuOTI4IDAgOTYtNDMuMDcyIDk2LTk2VjMyMGMwLTguNDgtMy4zNi0xNi42NC05LjM3Ni0yMi42MjR6TTcwNCAyMDUuMjQ4TDgxOC43NTIgMzIwSDcwNFYyMDUuMjQ4ek04MDAgODY0SDIyNGMtMTcuNjMyIDAtMzItMTQuMzM2LTMyLTMyVjE5MmMwLTE3LjYzMiAxNC4zNjgtMzIgMzItMzJoNDE2djE5MmMwIDE3LjY2NCAxNC4zMDQgMzIgMzIgMzJoMTYwdjQ0OGMwIDE3LjY2NC0xNC4zMzYgMzItMzIgMzJ6IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTI4OCAzNTJoMTkyYzE3LjY2NCAwIDMyLTE0LjMzNiAzMi0zMnMtMTQuMzM2LTMyLTMyLTMySDI4OGMtMTcuNjY0IDAtMzIgMTQuMzM2LTMyIDMyczE0LjMzNiAzMiAzMiAzMnpNNjA4IDQ4MEgyODhjLTE3LjY2NCAwLTMyIDE0LjMzNi0zMiAzMnMxNC4zMzYgMzIgMzIgMzJoMzIwYzE3LjY5NiAwIDMyLTE0LjMzNiAzMi0zMnMtMTQuMzA0LTMyLTMyLTMyek02MDggNjcySDI4OGMtMTcuNjY0IDAtMzIgMTQuMzA0LTMyIDMyczE0LjMzNiAzMiAzMiAzMmgzMjBjMTcuNjk2IDAgMzItMTQuMzA0IDMyLTMycy0xNC4zMDQtMzItMzItMzJ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+'
	const videoIcon = 'data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTY1OC4wNyAyNTZhNjQgNjQgMCAwIDEgNjQgNjRsLS4wMjIgMzMuNjY0IDQ5LjI4LTM4LjRhNjQgNjQgMCAwIDEgMTAzLjMzOSA1MC41MTdWNzA0LjE1YTY0IDY0IDAgMCAxLTEwMy4zMzkgNTAuNDc1bC00OS4yOC0zOC40djI2LjQ5NmE2NCA2NCAwIDAgMS02NCA2NEgyMTMuMzMzYTY0IDY0IDAgMCAxLTY0LTY0VjMyMGE2NCA2NCAwIDAgMSA2NC02NEg2NTguMDd6bTAgNjRIMjEzLjMzMnY0MjIuNjk5SDY1OC4wN2wtLjEyOC0xNTcuNTkgMTUyLjcyNiAxMTkuMDE5VjM2NS43Nkw2NTcuOTYzIDQ4NC42OTMgNjU4LjA2OSAzMjB6TTM4NCAzOTcuMzEyYTQyLjY2NyA0Mi42NjcgMCAwIDEgMjIuNzQxIDYuNTdsMTMzLjg2NyA4NC4zMzFhNDIuNjY3IDQyLjY2NyAwIDAgMSAuMzIgNzJMNDA3LjA2MSA2NDYuMjNhNDIuNjY3IDQyLjY2NyAwIDAgMS02NS43MjgtMzUuOTA0VjQzOS45OEE0Mi42NjcgNDIuNjY3IDAgMCAxIDM4NCAzOTcuMzEyem0yMS4zMzMgODEuMzIzdjkyLjYyOWw3Mi43OS00Ni43NjMtNzIuNzktNDUuODY2eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg=='
	const vscode = acquireVsCodeApi();

	function updateTutorials(response, addNoEnoughCoinWarning) {
		if (response.status === 402) {
			addUnlockPrompt(addNoEnoughCoinWarning);
		} else {
			response.json().then((json) => {
				const tutorialContainer = removeLoadingStatus();
				if (json.items.length === 0) {
					tutorialContainer.innerHTML = '<div>${this.bytelegendContext.getI18nText(
						'NoTutorials'
					)}</div>';
				} else {
					tutorialContainer.innerHTML = '';
					tutorialContainer.appendChild(tutorialsToOl(json.items));
				}
			}, onFetchingTutorialsError)
	    }
	}

	function addUnlockPrompt(addNoEnoughCoinWarning) {
		const tutorialContainer = removeLoadingStatus();
		tutorialContainer.innerHTML = '';

		if(addNoEnoughCoinWarning) {
			const noEnoughCoinDiv = document.createElement('div');
			noEnoughCoinDiv.style.color = 'red';
		    noEnoughCoinDiv.innerHTML = "${this.bytelegendContext.getI18nText(
					'SorryYouDontHaveEnoughCoin'
				)}";
		    tutorialContainer.appendChild(noEnoughCoinDiv);
		}

		const div = document.createElement('div');
		div.innerHTML = "${this.bytelegendContext.getI18nText(
			'PayCoinToUnlockTutorialsInVSCode',
			this.bytelegendContext.tutorialsPrice.toString()
		)}";

		const buttonDiv = document.createElement('div');
		const button = document.createElement('button');
		button.innerText = '${this.bytelegendContext.getI18nText('Unlock')}';
		button.onclick = onUnlockButtonClicked;
		buttonDiv.appendChild(button);

		tutorialContainer.appendChild(div);
		tutorialContainer.appendChild(buttonDiv);
		return div;
	}

	function onUnlockButtonClicked() {
		showLoadingStatus();
		const url = '${this.bytelegendContext.apiServer}/game/api/mission/${
			this.bytelegendContext.missionId
		}/unlockTutorials?returnTutorials=true';

		window.fetch(url, {method:'POST', credentials: 'include'}).then((response) => updateTutorials(response, true), onFetchingTutorialsError)
	}

	function showLoadingStatus() {
		document.querySelector('.loading-page').style.display = 'block';
		document.querySelector('.error-container').style.display = 'none';
		document.querySelector('.tutorials-container').style.display = 'none';
	}

	function removeLoadingStatus() {
		document.querySelector('.loading-page').style.display = 'none';
		document.querySelector('.error-container').style.display = 'none';
		const tutorialContainer = document.querySelector('.tutorials-container');
		tutorialContainer.style.display = 'block';
		return tutorialContainer;
	}

	function tutorialsToOl(tutorials) {
	    const ol = document.createElement('ol')
	    tutorials.forEach((tutorial) => ol.appendChild(tutorialToLi(tutorial)));
	    return ol
	}

	function getIcon(tutorial) {
	    const element = document.createElement('img')
	    if (tutorial.type.startsWith('text')) {
	        element.src = textIcon
	    } else if (tutorial.type.startsWith('video')){
	        element.src = videoIcon
	    } else {
	        return null
	    }

	    return element
	}

	function tutorialToLi(tutorial) {
	    const element = document.createElement('li');
	    const icon = getIcon(tutorial);

	    if (icon) {
	        element.appendChild(icon)
	    }

	    const textNode = document.createElement('span')
	    textNode.innerText = tutorial.title
	    element.appendChild(textNode)

	    element.onclick = function() {
	        Array.prototype.forEach.call(element.parentElement.children, (child) => {
	        	child.classList.remove('selected');
	        });
	        element.classList.add("selected");

	        vscode.postMessage({ type: 'open.tutorial', tutorial })
	    }
	    return element
	}

	function onFetchingTutorialsError(error) {
	    document.querySelector('.loading-page').style.display = 'none';
		document.querySelector('.tutorials-container').style.display = 'none';
		document.querySelector('.error-container').style.display = 'block';

		document.querySelector('.error-container').innerText = error.stack
	}

	function getTutorials() {
		const url = '${this.bytelegendContext.apiServer}/game/api/tutorials?missionId=${
			this.bytelegendContext.missionId
		}';
	  	window.fetch(url, {credentials: 'include'})
	   		.then((response) => updateTutorials(response, false), onFetchingTutorialsError)
	}

	getTutorials()
	</script>
</body>
</html>
		`;
		return ret;
	}
}
