// Utility to parse and merge LaTeX-Workshop autocomplete data into unified structures
// Depends on latexDataLoader.ts


import { loadLatexAutocompleteData } from './latexDataLoader';

export async function getUnifiedLatexCompletions(activePackages: string[] = []) {
  const data = await loadLatexAutocompleteData();
  const completions: any[] = [];
  const snippetCompletions: any[] = [];
  const environmentCompletions: any[] = [];
  const bibtexCompletions: any[] = [];

  // Merge base commands/macros
  const commands = (data as any).commands;
  if (commands && typeof commands === 'object') {
    for (const [name, entryRaw] of Object.entries(commands)) {
      const entry = entryRaw as any;
      completions.push({
        label: name,
        type: 'function',
        detail: entry.detail || '',
        info: entry.documentation || '',
        snippet: entry.snippet || undefined,
        source: 'base',
      });
    }
  }
  const macros = (data as any).macros;
  if (Array.isArray(macros)) {
    for (const macro of macros) {
      completions.push({
        label: macro.name,
        type: 'function',
        detail: macro.detail || '',
        info: macro.doc || '',
        snippet: macro.arg?.snippet || undefined,
        source: 'base',
      });
    }
  }

  // Merge environments
  const environments = (data as any).environments;
  if (Array.isArray(environments)) {
    for (const env of environments) {
      environmentCompletions.push({
        label: env.name,
        type: 'environment',
        detail: 'environment',
        snippet: env.arg?.snippet || undefined,
        source: 'base',
      });
    }
  }

  // Merge snippets
  const latexSnippet = (data as any)['latex-snippet'];
  if (latexSnippet && typeof latexSnippet === 'object') {
    for (const [name, entryRaw] of Object.entries(latexSnippet)) {
      const entry = entryRaw as any;
      snippetCompletions.push({
        label: name,
        type: 'snippet',
        detail: entry.description || 'snippet',
        snippet: entry.body,
        source: 'snippet',
      });
    }
  }

  // Merge BibTeX completions (optional)
  const bibtexEntries = (data as any)['bibtex-entries'];
  if (bibtexEntries && typeof bibtexEntries === 'object') {
    for (const [name, fields] of Object.entries(bibtexEntries)) {
      bibtexCompletions.push({
        label: name,
        type: 'bibtex',
        detail: 'BibTeX entry',
        info: JSON.stringify(fields),
        source: 'bibtex',
      });
    }
  }

  // Merge package-specific completions
  if (activePackages.length > 0) {
    for (const pkg of activePackages) {
      try {
        const res = await fetch(`/assets/latex-autocomplete-data/packages/${pkg}.json`);
        if (!res.ok) throw new Error('Not found');
        const pkgData = await res.json();
        if (pkgData && Array.isArray(pkgData)) {
          for (const entry of pkgData) {
            completions.push({
              label: entry.name,
              type: entry.type || 'function',
              detail: entry.detail || pkg,
              snippet: entry.snippet || undefined,
              source: pkg,
            });
          }
        }
      } catch (e) {
        // Package file may not exist
      }
    }
  }

  return {
    completions,
    snippetCompletions,
    environmentCompletions,
    bibtexCompletions,
  };
}
