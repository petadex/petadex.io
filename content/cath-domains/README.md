# CATH / methodology content for S3

Long front-facing prose must **not** live in the JS bundle. Upload human-written JSON to S3:

| Content | Env var | Default URL pattern |
|---------|---------|---------------------|
| Per CATH domain | `GATSBY_CATH_DOMAIN_CONTENT_BASE_URL` | `…/cath-domains/{cathId}.json` |
| Methodology | `GATSBY_METHODOLOGY_CONTENT_URL` | `…/docs/methodology.json` |

See `_schema/` for shapes. Old LLM drafts: recover with `git show ad5994e:frontend/src/data/catDomainCatalog.js` and rewrite by hand before upload.

Do **not** publish the "Component-level HMM generation (PAZy HMMs)" article unless Thomas reverses that.
