import * as vscode from 'vscode';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { AnswerCommit, PullRequestAnswer } from '@/bytelegend/entities';

export class MyAnswerTreeDataProvider
	implements vscode.TreeDataProvider<vscode.TreeItem> {
	public static viewId = 'bytelegend.views.my-answer-list';
	private _onDidChangeTreeData = new vscode.EventEmitter<undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private _answers: PullRequestAnswer[] = [];
	private _idToTreeNode: Map<string, any> = new Map();
	private _idToCollapseState: Map<string, TreeItemCollapsibleState> = new Map();

	public getNodeByCheckRunId(id: string): AnswerCommit | null {
		return null;
	}

	public async updateTree(answers: PullRequestAnswer[]) {
		this._answers = answers;
		this._idToTreeNode.clear();
		// await this.dfs(answers);
		//
		// this._idToCollapseState.forEach((value, key, map) => {
		// 	if (!this._idToTreeNode.has(key)) {
		// 		this._idToCollapseState.delete(key);
		// 	}
		// });
		this._onDidChangeTreeData.fire(undefined);
	}

	// private async dfs<T extends MyAnswerTreeNode>(array: T[]) {
	// 	for (const element of array) {
	// 		this._idToTreeNode.set(element.id, element);
	// 		await this.dfs(await element.getChildren());
	// 	}
	// }

	async getChildren(element?: vscode.TreeItem): Promise<TreeItem[]> {
		if (!element) {
			return this._answers.map((answer) => {
				this._idToTreeNode.set(answer.id, answer);
				return answer.treeItem;
			});
		} else if (this._idToTreeNode.has(element.id)) {
			const node = this._idToTreeNode.get(element.id);
			if (node instanceof PullRequestAnswer) {
				return node.commits.map((commit) => {
					this._idToTreeNode.set(commit.id, commit);
					return commit.treeItem;
				});
			} else if (node instanceof AnswerCommit) {
				return await node.getChildren();
			}
		} else {
			return [];
		}
	}

	// 1. Bind click action
	// 2. Fill the collapse state
	// private fillCollapseState(treeItem: TreeItem): vscode.TreeItem {
	// 	if (!treeItem.collapsibleState) {
	// 		return treeItem;
	// 	}
	// 	treeItem.command = {
	// 		title: 'log',
	// 		command: 'bytelegend.log',
	// 		arguments: [`Tree ${treeItem.id} is Clicked!`],
	// 	};
	// 	const oldState = this._idToCollapseState[treeItem.id];
	// 	if (oldState) {
	// 		treeItem.collapsibleState = oldState;
	// 	} else if (node instanceof AnswerCommit) {
	// 		treeItem.collapsibleState = TreeItemCollapsibleState.Collapsed;
	// 	} else {
	// 		treeItem.collapsibleState = TreeItemCollapsibleState.Collapsed;
	// 	}
	// 	this._idToCollapseState[treeItem.id] = oldState;
	// 	return treeItem;
	// }

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}
}
