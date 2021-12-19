/**
 * @file extension entry
 * @author netcon
 */

import * as vscode from 'vscode';
import {commands, TreeItemCollapsibleState, Uri} from 'vscode';
import {getExtensionContext, setExtensionContext} from '@/helpers/context';
import {registerGitHub1sCommands} from '@/commands';
import {registerVSCodeProviders} from '@/providers';
import {GitHub1sFileSystemProvider} from '@/providers/fileSystemProvider';
import router from '@/router';
import {activateSourceControl} from '@/source-control';
import {registerEventListeners} from '@/listeners';
import {PageType} from './router/types';
import {byteLegendContext} from '@/bytelegend/bytelegendContext';
import {open, registerByteLegendCommands} from '@/bytelegend/commands';
import {MyAnswerTreeDataProvider} from '@/bytelegend/my-answer-list-view';
import {TutorialsView} from '@/bytelegend/tutorials-view';
import {sleep} from "@/bytelegend/utils";

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
	// registerCustomViews();
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
	await registerByteLegendViews();
	vscode.workspace.onDidOpenTextDocument((doc) => {
		if (doc && doc.languageId === 'markdown') {
			openMarkdownPreview(browserUrl, doc.uri);
		}
	});

	const activityBarVisibleNow = await vscode.commands.executeCommand('bytelegend.isActivityBarVisible');
	const expectedActivityBarVisible = byteLegendContext.showActivityBar;
	if ((activityBarVisibleNow && !expectedActivityBarVisible) || (!activityBarVisibleNow && expectedActivityBarVisible)) {
		await vscode.commands.executeCommand(
			'workbench.action.toggleActivityBarVisibility'
		);
	}

	await configureDefaultSettings();
	await focusInitView();
	await openInitReadme();
}

async function focusInitView() {
	if (byteLegendContext.initFocusView) {
		const viewName = byteLegendContext.initFocusView.toLowerCase();
		if (viewName.indexOf('answer') != -1) {
			await byteLegendContext.focusOnMyAnswerView();
		} else if (viewName.indexOf('tutorial') != -1) {
			await byteLegendContext.focusOnTutorialsView();
		}
	}
}

async function openInitReadme() {
	if (byteLegendContext.initReadme) {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		if (byteLegendContext.initReadme.startsWith('https://')) {
			await open(byteLegendContext.initReadme.replace('https://', 'github1s://'));
		} else {
			await open(byteLegendContext.initReadme);
		}
	}
}

async function configureDefaultSettings() {
	vscode.workspace.getConfiguration().update('files.autoSave', 'off', vscode.ConfigurationTarget.Global)
	vscode.workspace.getConfiguration().update('editor.bracketPairColorization.enabled', true, vscode.ConfigurationTarget.Global)
}

async function registerByteLegendViews() {
	const context = getExtensionContext();

	const myAnswerTreeView = vscode.window.createTreeView(
		MyAnswerTreeDataProvider.viewId,
		{
			treeDataProvider: byteLegendContext.answerTreeDataProvider,
		}
	);
	myAnswerTreeView.onDidChangeSelection((e) => {
		const oldState = e.selection[0].collapsibleState;
		if (oldState == TreeItemCollapsibleState.Collapsed) {
			myAnswerTreeView.reveal(e.selection[0], {expand: true});
		}
	});

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			TutorialsView.viewId,
			new TutorialsView(byteLegendContext)
		),
		myAnswerTreeView
	);
}

function getFileName(filePath: string) {
	const lastIndexOfSlash = filePath.lastIndexOf('/');
	return filePath.substring(lastIndexOfSlash + 1);
}

/*
This is a bit tricky. Sometimes, things may happen in the following order:

- Open whatever.md from previous history.
- Triggers `onDidOpenTextDocument`.
- We fire 'workbench.action.closeAllEditors' to close all editors.
- We open initReadme
- The preview of whatever.md pops up as the active tab, hiding initReadme.

In this method, when we want to open preview, we check if the markdown file is a visible tab,
and only preview if it's visible. If it's not visible, poll for at most 5 seconds.
 */
async function openMarkdownPreview(initBrowserUrl: string, uri: Uri) {
	const deadline = new Date().getTime() + 5000
	while (new Date().getTime() < deadline) {
		const tabGroups: string[][] = await vscode.commands.executeCommand('bytelegend.getEditorTabGroups');
		const flatTabs = Array.prototype.concat.apply([], tabGroups);
		const fileName = getFileName(uri.path);
		console.log(`tabs: ${JSON.stringify(flatTabs)}, file: ${fileName}`)
		if (flatTabs.find((tab) => tab == fileName)) {
			// we may have already fired `closeAllEditors` command, don't show the preview for the closed markdown tab
			await doOpenPreview(initBrowserUrl, uri, tabGroups)
			return
		}
		await sleep(500)
	}

	console.warn(`Fail to get open tab matching ${uri.toString()}, skip opening preview.`)
}

async function doOpenPreview(initBrowserUrl: string, uri: Uri, tabGroups: string[][]) {
	await vscode.commands.executeCommand('markdown.showPreview', null, [uri], {locked: true});

	if (uri.toString().endsWith('README.md') && initBrowserUrl.endsWith('README.md') && tabGroups.length == 1) {
		// only open the challenged file upon first open
		const initData = await commands.executeCommand('bytelegend.getInitData');
		const whitelist = initData?.['whitelist'] || [];
		if (whitelist.length != 0 && !whitelist[0].endsWith('/')) {
			const fileName = getFileName(whitelist[0]);
			if (!tabGroups[0].find((name) => name == fileName)) {
				await vscode.commands.executeCommand(
					'vscode.openWith',
					Uri.parse(`github1s:/${whitelist[0]}`),
					'default',
					vscode.ViewColumn.Beside
				);
			}
		}
	}
}

// initialize the VSCode's state according to the router url
export const initialVSCodeState = async () => {
	const routerState = await router.getState();
	const {filePath, pageType} = routerState;
	const scheme = GitHub1sFileSystemProvider.scheme;

	if (filePath && pageType === PageType.TREE) {
		vscode.commands.executeCommand(
			'revealInExplorer',
			vscode.Uri.parse('').with({scheme, path: filePath})
		);
	} else if (filePath && pageType === PageType.BLOB) {
		const {startLineNumber, endLineNumber} = routerState;
		const start = new vscode.Position(startLineNumber - 1, 0);
		const end = new vscode.Position(endLineNumber - 1, 999999);
		const documentShowOptions: vscode.TextDocumentShowOptions = startLineNumber
			? {selection: new vscode.Range(start, end)}
			: {};

		// TODO: the selection of the opening file may be cleared
		// when editor try to restore previous state in the same file
		vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.parse('').with({scheme, path: filePath}),
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
