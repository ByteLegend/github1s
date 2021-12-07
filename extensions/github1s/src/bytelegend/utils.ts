export async function runCatching<T>(promise: Promise<T>): Promise<any[]> {
	return promise
		.then((data) => [null, data])
		.catch((err) => {
			console.trace(err);
			return [err];
		});
}

export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
