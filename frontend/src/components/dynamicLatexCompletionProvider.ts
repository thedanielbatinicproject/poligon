
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
  
  // Snippets FIRST (they have better descriptions)
  if (completionsData.snippetCompletions) {
    options = options.concat(
      completionsData.snippetCompletions.filter((sn: any) => sn.label.startsWith(term))
    );
  }
  
  // Commands/macros (but skip if we already have a snippet with same label)
  if (completionsData.completions) {
    const snippetLabels = new Set(options.map(o => o.label));
    options = options.concat(
      completionsData.completions
        .filter((cmd: any) => cmd.label.startsWith(term))
        .filter((cmd: any) => !snippetLabels.has(cmd.label)) // Skip duplicates
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

  // Move detail to info for external tooltip display, add type as detail label
  options = options.map(opt => {
    let typeLabel = '';
    if (opt.type === 'snippet') {
      typeLabel = 'snippet';
    } else if (opt.type === 'environment') {
      typeLabel = 'environment';
    } else if (opt.type === 'bibtex') {
      typeLabel = 'bibtex';
    } else if (opt.source && opt.source !== 'base' && opt.source !== 'snippet') {
      typeLabel = opt.source;
    }
    
    // Debug logging
    if (opt.label === 'chapter') {
      console.log('[DEBUG] chapter opt BEFORE transform:', opt);
      console.log('[DEBUG] chapter opt.detail:', opt.detail);
      console.log('[DEBUG] chapter opt.info:', opt.info);
    }
    
    const result = {
      ...opt,
      boost: opt.type === 'snippet' ? 99 : undefined,
      detail: typeLabel, // Shows inline (e.g., "snippet")
      info: opt.detail || opt.info // Shows in external tooltip
    };
    
    if (opt.label === 'chapter') {
      console.log('[DEBUG] chapter AFTER transform:', result);
      console.log('[DEBUG] chapter result.info:', result.info);
    }
    
    return result;
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
