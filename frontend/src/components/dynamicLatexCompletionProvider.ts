
import { detectLatexPackages } from './detectLatexPackages';
import { getUnifiedLatexCompletions } from './latexCompletionsUnified';
import { CompletionContext } from '@codemirror/autocomplete';

// Simple in-memory cache for completions by package set
const completionsCache: Record<string, Promise<any>> = {};

/**
 * CodeMirror 6 completion source for LaTeX, dynamically loading completions based on document content.
 * Includes base, snippet, environment, BibTeX, and active package completions.
 */
export async function dynamicLatexCompletionSource(context: CompletionContext) {
  // Only trigger after backslash and word
  const word = context.matchBefore(/\\[a-zA-Z]*$/);
  if (!word || (word.from == word.to && !context.explicit)) return null;
  const docText = context.state.doc.toString();
  const activePackages = detectLatexPackages(docText);
  // Use a cache key based on sorted package names
  const cacheKey = activePackages.slice().sort().join(',');
  let completionsData;
  if (Object.prototype.hasOwnProperty.call(completionsCache, cacheKey)) {
    completionsData = await completionsCache[cacheKey];
  } else {
    const promise = getUnifiedLatexCompletions(activePackages);
    completionsCache[cacheKey] = promise;
    completionsData = await promise;
  }
  const term = word.text.slice(1); // remove leading '\'

  // Merge all completions (commands, snippets, environments, BibTeX)
  let options: any[] = [];
  // Commands/macros
  if (completionsData.completions) {
    options = options.concat(
      completionsData.completions.filter((cmd: any) => cmd.label.startsWith(term))
    );
  }
  // Snippets
  if (completionsData.snippetCompletions) {
    options = options.concat(
      completionsData.snippetCompletions.filter((sn: any) => sn.label.startsWith(term))
    );
  }
  // Environments (triggered by \\begin, \\end, etc. -- can be refined)
  if (completionsData.environmentCompletions && /^(begin|end)/.test(term)) {
    options = options.concat(
      completionsData.environmentCompletions.filter((env: any) => env.label.startsWith(term.replace(/^(begin|end)/, '')))
    );
  }
  // BibTeX (optional, e.g. \\cite)
  if (completionsData.bibtexCompletions && /^cite/.test(term)) {
    options = options.concat(
      completionsData.bibtexCompletions.filter((bib: any) => bib.label.startsWith(term.replace(/^cite/, '')))
    );
  }

  // Add tags and improve snippet/environment/BibTeX display
  options = options.map(opt => {
    let tag = undefined;
    let detail = opt.detail;
    if (opt.type === 'snippet') {
      tag = 'snippet';
      detail = opt.detail || 'Snippet';
    } else if (opt.type === 'environment') {
      tag = 'environment';
      detail = opt.detail || 'Environment';
    } else if (opt.type === 'bibtex') {
      tag = 'bibtex';
      detail = opt.detail || 'BibTeX';
    } else if (opt.source && opt.source !== 'base' && opt.source !== 'snippet') {
      tag = opt.source;
    }
    return {
      ...opt,
      boost: opt.type === 'snippet' ? 99 : undefined,
      tag,
      detail
    };
  });

  // Add custom insertimage completion always
  if ('insertimage'.startsWith(term)) {
    options.unshift({
      label: 'insertimage',
      type: 'function',
      info: 'Insert image from this document uploads',
      apply: () => '', // UI handler must be added in the editor
      boost: 100
    });
  }

  return {
    from: word.from + 1,
    options
  };
}
