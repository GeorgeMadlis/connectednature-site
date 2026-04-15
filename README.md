# ConnectedNature Site

Public website for **ConnectedNature**.

ConnectedNature is an experimental website for AI-assisted validation of selected statements and ideas about connectedness across nature, ecology, society, knowledge, history, and human systems. It is designed as a public-facing layer for structured inquiry rather than opinion writing.

The website is separate from **COIN**, which serves as the research engine and provenance workflow behind the project.

## Purpose

The site explores claims, questions, and statements such as:

- how ecological connectedness shapes biodiversity and climate
- how complexity relates to social resilience or collapse
- how information environments shape knowledge and belief
- how historical connections continue to influence present events

Each article should begin with an originating statement or question, then move through:

1. evidence gathering
2. source evaluation
3. competing interpretations
4. critical synthesis

The goal is not to assert a worldview, but to make human inquiry visible and readable using AI-based tools with care and transparency.

## Relationship to COIN

- **ConnectedNature** is the public website
- **COIN** is the research process, tooling, and provenance trail behind it

Where relevant, the site should link readers back to GitHub repositories, research folders, source logs, prompts, notes, and compiled outputs.

## Initial Structure

Suggested early structure:

- `site/index.html`
- `site/about.html`
- `site/method.html`
- `site/posts/complexity-threshold.html`
- `site/style.css`

Additional draft material can live in:

- `content/posts/`

Prompt and instruction files for VS Code / Copilot live in:

- `.github/copilot-instructions.md`
- `.github/prompts/`

## Design Direction

The site should feel:

- calm
- scholarly
- minimalist
- nature-connected
- readable
- restrained

Preferred visual cues:

- off-white background
- dark neutral text
- muted green accents
- serif headings
- sans-serif body
- spacious layouts
- low visual noise

## Technical Direction

For the first version:

- plain HTML and CSS
- minimal dependencies
- semantic, accessible markup
- easy manual editing
- static deployment

This keeps the site lightweight and easy to deploy on Cloudflare Pages.

## Development Workflow

Recommended workflow:

1. edit locally in VS Code
2. use Copilot / agent prompts from `.github/prompts/`
3. commit changes to GitHub
4. let Cloudflare Pages generate preview deployments
5. publish from the main branch when ready

## Deploying to Cloudflare Pages

This repository is already structured for a simple Cloudflare Pages deployment:

```text
README.md
site/
  index.html
  about.html
  method.html
  posts/
    complexity-threshold.html
  style.css
```

Use these Cloudflare Pages settings:

- source: GitHub
- root directory: `/` (repository root)
- framework preset: `None`
- build command: none
- build output directory: `site`
- production branch: `main` (or your chosen default branch)

This project should stay framework-free. No bundler, package manager, or build tooling is
required as long as the deployable files remain in `site/`.

For static hosting, keep internal links and asset references relative:

- top-level pages inside `site/` should link like `about.html`, `method.html`, `style.css`
- pages inside `site/posts/` should link back up like `../index.html` and `../style.css`

The current site follows that pattern, so it can be deployed directly from GitHub to Cloudflare
Pages without a build step.

## Editorial Principles

When adding or revising content:

- avoid hype and promotional language
- avoid presenting speculation as fact
- preserve the difference between the initial statement and the final synthesis
- make uncertainty visible where needed
- favor clarity, precision, and restraint

## First Suggested Article

The first sample post can investigate:

**There Is a Complexity Threshold That No Civilization Has Ever Survived**

This should be treated as a research question, not as an accepted conclusion.

## Next Steps

A good first build includes:

- homepage
- About page
- Method page
- one sample article
- one GitHub research-trail section

After that, the site can expand into topic pages, additional posts, and stronger links to COIN-generated research artifacts.
