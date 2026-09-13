// Makes the jest-dom matchers (toBeInTheDocument, toBeDisabled, toHaveTextContent…)
// visible to svelte-check/tsc for the component test files. The runtime
// registration lives in ../vitest-setup.ts.
import '@testing-library/jest-dom/vitest';
