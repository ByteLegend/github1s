import * as vscode from 'vscode';
import { getNonce } from '@/helpers/util';
import { Tutorial } from '@/bytelegend/entities';

function getIframeTagForTutorial(tutorial: Tutorial): string {
	if (tutorial.type === 'video/youtube') {
		// https://www.youtube.com/watch?v=ABC -> https://www.youtube.com/embed/ABC
		return `
		<iframe
			class="tutorial-video-player"
			src="${tutorial.href.replace('/watch?v=', '/embed/')}"
			controls="true"
			width="100%"
			height="100%"
		></iframe>
		`;
	} else if (tutorial.type === 'video/bilibili') {
		// https://www.bilibili.com/video/BV1JJ41197UK -> BV1JJ41197UK
		const bvid = getBvid(tutorial.href);
		return `
		<iframe
			class="tutorial-video-player"
			src='https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&t=0'
			width="100%"
			height="100%"
			border="0"
			framespacing="0"
			allowfullscreen="true"
		></iframe>
		`;
	}
}

function substringAfter(str: string, target: string) {
	const index = str.indexOf(target);
	if (index === -1) {
		return str;
	} else {
		return str.substring(index + target.length);
	}
}

function substringBefore(str: string, target: string) {
	const index = str.indexOf(target);
	if (index === -1) {
		return str;
	} else {
		return str.substring(0, index);
	}
}

function getBvid(url: string): string {
	if (url.indexOf('www.bilibili.com') !== -1) {
		return substringAfter(url, 'video/');
	} else {
		return substringBefore(substringAfter(url, 'bvid'), '&');
	}
}

export function createVideoTutorial(tutorial: Tutorial) {
	// Create and show panel
	const panel = vscode.window.createWebviewPanel(
		'VideoTutorial',
		tutorial.title,
		vscode.ViewColumn.Active,
		{
			enableScripts: true,
		}
	);
	const nonce = getNonce();
	const iframe = getIframeTagForTutorial(tutorial);

	panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src localhost:8080 bytelegend.com; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; frame-src youtube.com www.youtube.com bilibili.com player.bilibili.com; img-src 'self' data:;">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${tutorial.title}</title>
	<style nonce="${nonce}">
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

.tutorial-video-player {
    position: absolute;
    top: 50%;
    left: 50%;
    border: none;
    transform: translate(-50%, -50%);
}
	</style>
</head>
<body>
${iframe}
</body>
</html>
		`;
}
