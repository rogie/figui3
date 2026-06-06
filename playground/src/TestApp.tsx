import { componentContracts, componentGroups } from "./testing/componentManifest";

function formatMarkup(markup: string) {
  return markup.trim();
}

export default function TestApp() {
  const registered = new Set(
    componentContracts.filter((contract) => customElements.get(contract.tag)).map((contract) => contract.tag),
  );

  return (
    <main className="tests-app">
      <header className="tests-hero">
        <p className="tests-kicker">FigUI3 Tests</p>
        <h1>Component Contracts</h1>
        <p>
          Visual fixtures for every registered FigUI component.
          Automated Playwright tests use the same manifest.
        </p>
      </header>

      {componentGroups.map((group) => {
        const contracts = componentContracts.filter((contract) => contract.group === group);
        return (
          <section className="tests-group" key={group}>
            <fig-header borderless>
              <h2>{group}</h2>
              <span>{contracts.length} components</span>
            </fig-header>
            <div className="tests-grid">
              {contracts.map((contract) => (
                <article className="tests-card" key={contract.tag}>
                  <fig-header borderless>
                    <div>
                      <h3>{contract.title}</h3>
                      <code>{contract.tag}</code>
                    </div>
                    <span
                      className="tests-status-dot"
                      data-state={registered.has(contract.tag) ? "registered" : "missing"}
                      title={registered.has(contract.tag) ? "Registered" : "Missing"}
                    />
                  </fig-header>
                  <div
                    className="tests-fixture"
                    dangerouslySetInnerHTML={{ __html: contract.markup }}
                  />
                  <details>
                    <summary>Markup</summary>
                    <pre>{formatMarkup(contract.markup)}</pre>
                  </details>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
