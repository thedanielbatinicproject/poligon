import { Completion, CompletionRenderConfig } from '@codemirror/autocomplete';

/**
 * Custom renderer for LaTeX completions: shows label, tag, detail, and info as tooltip.
 */
export function renderLatexCompletion(completion: Completion, state: CompletionRenderConfig) {
  const dom = document.createElement('div');
  dom.className = 'cm-latex-completion';
  // Main label
  const label = document.createElement('span');
  label.className = 'cm-latex-label';
  label.textContent = completion.label;
  dom.appendChild(label);
  // Tag (e.g. snippet, environment, package)
  if (completion.tag) {
    const tag = document.createElement('span');
    tag.className = 'cm-latex-tag';
    tag.textContent = String(completion.tag);
    dom.appendChild(tag);
  }
  // Detail (right-aligned)
  if (completion.detail) {
    const detail = document.createElement('span');
    detail.className = 'cm-latex-detail';
    detail.textContent = String(completion.detail);
    dom.appendChild(detail);
  }
  // Tooltip/info (on hover)
  if (completion.info) {
    dom.title = String(completion.info);
  }
  return dom;
}
