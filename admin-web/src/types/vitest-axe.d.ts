declare module 'vitest-axe' {
  import type { AxeResults, AxeOptions } from 'axe-core'

  export function axe(node: HTMLElement, options?: AxeOptions): Promise<AxeResults>
  export const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): {
      pass: boolean
      message(): string
    }
  }
}

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): T
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}

