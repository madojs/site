import { html, signal, type TemplateResult } from "@madojs/mado";

interface CodeExampleOptions {
  label: string;
  code: string;
  language?: string;
}

export const codeExample = ({
  label,
  code,
  language = "shell",
}: CodeExampleOptions): TemplateResult => {
  const copyState = signal<"Copy" | "Copied" | "Copy failed">("Copy");

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      copyState.set("Copied");
    } catch {
      copyState.set("Copy failed");
    }
  };

  return html`
    <figure class="site-code-example">
      <figcaption class="site-code-example-header">
        <span>${label}</span>
        <button
          class="mado-ui-button site-copy-button"
          type="button"
          data-size="small"
          data-variant="ghost"
          @click=${copy}
        >
          ${() => copyState()}
        </button>
      </figcaption>
      <pre
        class="mado-ui-code-block site-code-example-body"
        tabindex="0"
        data-language=${language}
      ><code>${code}</code></pre>
    </figure>
  `;
};
