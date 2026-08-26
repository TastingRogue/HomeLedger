/// <reference types="@sveltejs/kit" />

declare namespace App {
	interface Locals {
		user?: {
			id: number;
			email: string;
			name: string;
		};
	}

	interface PageData {}

	interface Error {
		message: string;
		code?: string;
	}

	interface Platform {}
}
