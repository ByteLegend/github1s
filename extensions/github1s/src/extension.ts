/**
 * @file extension entry
 * @author netcon
 */

import * as vscode from 'vscode';
import { setExtensionContext } from '@/helpers/context';
import { registerGitHub1sCommands } from '@/commands';
import { registerVSCodeProviders } from '@/providers';
import { registerCustomViews } from '@/views';
import { GitHub1sFileSystemProvider } from '@/providers/fileSystemProvider';
import { showSponsors } from '@/sponsors';
import { showGitpod } from '@/gitpod';
import router from '@/router';
import { activateSourceControl } from '@/source-control';
import { registerEventListeners } from '@/listeners';
import { PageType } from './router/types';
import { byteLegendContext } from '@/bytelegend/bytelegendContext';
import { registerByteLegendCommands } from '@/bytelegend/commands';
import { getApiServer } from '@/interfaces/github-api-rest';
import { sleep } from '@/bytelegend/utils';

export async function activate(context: vscode.ExtensionContext) {
	const browserUrl = (await vscode.commands.executeCommand(
		'github1s.vscode.get-browser-url'
	)) as string;

	// set the global context for convenient
	setExtensionContext(context);
	// Ensure the router has been initialized at first
	await router.initialize(browserUrl);

	// register the necessary event listeners
	registerEventListeners();
	// register VS Code providers
	registerVSCodeProviders();
	// register custom views
	registerCustomViews();
	// register GitHub1s Commands
	registerGitHub1sCommands();

	// activate SourceControl features,
	activateSourceControl();

	// sponsors in Status Bar
	// Below is changed by ByteLegend
	// showSponsors();
	// showGitpod();
	// Above is changed by ByteLegend

	// initialize the VSCode's state
	initialVSCodeState();

	// Below is changed by ByteLegend
	registerByteLegendCommands();
	await byteLegendContext.init();
	vscode.workspace.onDidOpenTextDocument((doc) => {
		console.log(`${doc.uri}: ${doc.languageId}`);
		if (doc && doc.languageId === 'markdown') {
			openMarkdownPreview(doc.uri.toString().substring('github1s:'.length));
		}
	});
	// Above is changed by ByteLegend
}

async function openMarkdownPreview(docFilePath: string) {
	const deadline = new Date().getTime() + 5000;
	while (new Date().getTime() < deadline) {
		const url = (await vscode.commands.executeCommand(
			'github1s.vscode.get-browser-url'
		)) as string;
		console.log(`url: ${url}`);
		if (url.endsWith(docFilePath)) {
			console.log('showPreview');
			await vscode.commands.executeCommand('markdown.showPreview').then(
				() => {},
				(e) => console.error(e)
			);
			return;
		}

		await sleep(500);
	}
	console.warn(
		`Timeout waiting for browser url to change, skip showing preview for ${docFilePath}`
	);
}

// initialize the VSCode's state according to the router url
export const initialVSCodeState = async () => {
	const routerState = await router.getState();
	const { filePath, pageType } = routerState;
	const scheme = GitHub1sFileSystemProvider.scheme;

	if (filePath && pageType === PageType.TREE) {
		vscode.commands.executeCommand(
			'revealInExplorer',
			vscode.Uri.parse('').with({ scheme, path: filePath })
		);
	} else if (filePath && pageType === PageType.BLOB) {
		const { startLineNumber, endLineNumber } = routerState;
		const start = new vscode.Position(startLineNumber - 1, 0);
		const end = new vscode.Position(endLineNumber - 1, 999999);
		const documentShowOptions: vscode.TextDocumentShowOptions = startLineNumber
			? { selection: new vscode.Range(start, end) }
			: {};

		// TODO: the selection of the opening file may be cleared
		// when editor try to restore previous state in the same file
		vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse('').with({ scheme, path: filePath }),
			documentShowOptions
		);
	} else if (pageType === PageType.PULL_LIST) {
		vscode.commands.executeCommand('github1s.views.pull-request-list.focus');
	} else if (pageType === PageType.COMMIT_LIST) {
		vscode.commands.executeCommand('github1s.views.commit-list.focus');
	} else if ([PageType.PULL, PageType.COMMIT].includes(pageType)) {
		vscode.commands.executeCommand('workbench.scm.focus');
	}
};
