/**
 * @file register views
 */

import * as vscode from 'vscode';
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

	context.subscriptions.push(
		// register settings view
		vscode.window.registerWebviewViewProvider(
			SettingsView.viewType,
			new SettingsView()
		),
		// Below is changed by ByteLegend
		vscode.window.registerTreeDataProvider(
			MyAnswerTreeDataProvider.viewId,
			byteLegendContext.answerTreeDataProvider
		)

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
