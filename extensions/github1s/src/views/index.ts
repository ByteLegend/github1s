/**
 * @file register views
 */

import * as vscode from 'vscode';
import { TreeItemCollapsibleState } from 'vscode';
import { getExtensionContext } from '@/helpers/context';
import { SettingsView } from './settings-view';
import { PullRequestTreeDataProvider } from './pull-list-view';
import { CommitTreeDataProvider } from './commit-list-view';
import { MyAnswerTreeDataProvider } from '@/bytelegend/my-answer-list-view';
import { byteLegendContext } from '@/bytelegend/bytelegendContext';

export const commitTreeDataProvider = new CommitTreeDataProvider();
export const pullRequestTreeDataProvider = new PullRequestTreeDataProvider();

export const registerCustomViews = () => {
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
			myAnswerTreeView.reveal(e.selection[0], { expand: true });
		}
	});

	context.subscriptions.push(
		// register settings view
		vscode.window.registerWebviewViewProvider(
			SettingsView.viewType,
			new SettingsView()
		),
		// Below is changed by ByteLegend
		myAnswerTreeView

		// // register pull request view which is in source control panel
		// vscode.window.registerTreeDataProvider(
		// 	PullRequestTreeDataProvider.viewType,
		// 	pullRequestTreeDataProvider
		// ),
		//
		// // register commit view which is in source control panel
		// vscode.window.registerTreeDataProvider(
		// 	CommitTreeDataProvider.viewType,
		// 	commitTreeDataProvider
		// )
		// Above is changed by ByteLegend
	);
};
