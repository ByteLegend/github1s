import * as vscode from 'vscode';
import { TreeItem } from 'vscode';
import { AnswerCommit, PullRequestAnswer } from '@/bytelegend/entities';
import { ByteLegendContext } from '@/bytelegend/bytelegendContext';

export class MyAnswerTreeDataProvider
	implements vscode.TreeDataProvider<vscode.TreeItem> {
	public static viewId = 'bytelegend.views.my-answer-list';
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private _answers: PullRequestAnswer[] = [];
	private _idToTreeNode: Map<string, any> = new Map();
	private _idToParentNode: Map<string, any> = new Map();

	constructor(private readonly context: ByteLegendContext) {}

	public getNodeById(id: string): AnswerCommit | PullRequestAnswer | null {
		const ret = this._idToTreeNode.get(id);
		if (ret instanceof AnswerCommit) {
			return ret;
		} else if (ret instanceof PullRequestAnswer) {
			return ret;
		} else {
			return null;
		}
	}

	public getNodeByCheckRunId(checkRunId: string): AnswerCommit | null {
		for (const value of this._idToTreeNode.values()) {
			if (value instanceof AnswerCommit && value.checkRunId == checkRunId) {
				return value;
			}
		}
		return null;
	}

	get answers() {
		return this._answers || [];
	}

	public async updateTree(answers: PullRequestAnswer[]) {
		this._answers = answers;
		this._idToTreeNode.clear();
		this._idToParentNode.clear();

		answers.forEach((answer) => {
			this._idToTreeNode.set(answer.id, answer);
			answer.commits.forEach((commit) => {
				this._idToTreeNode.set(commit.id, commit);
				this._idToParentNode.set(commit.id, answer);
			});
		});
		this._onDidChangeTreeData.fire();
	}

	async getParent(element: vscode.TreeItem): Promise<TreeItem | null> {
		const node = this._idToParentNode.get(element.id);
		if (!node) {
			return null;
		} else if (node instanceof PullRequestAnswer) {
			return node.treeItem;
		} else if (node instanceof AnswerCommit) {
			return node.treeItem;
		} else {
			throw Error(`Can't get parent for element: ${element.id}`);
		}
	}

	async getChildren(element?: vscode.TreeItem): Promise<TreeItem[]> {
		if (!element) {
			if (!this._answers) {
				return [];
			}
			return this._answers.map((answer) => answer.treeItem);
		} else if (this._idToTreeNode.has(element.id)) {
			const node = this._idToTreeNode.get(element.id);
			if (node instanceof PullRequestAnswer) {
				return node.commits.map((commit) => commit.treeItem);
			} else if (node instanceof AnswerCommit) {
				const changedFiles = await node.getChildren();
				changedFiles.forEach((file) => {
					this._idToTreeNode.set(file.id, file);
					this._idToParentNode.set(file.id, node);
				});
				return changedFiles;
			}
		} else {
			return [];
		}
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}
}
