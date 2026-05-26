import { FileText, Radio } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { SaveButton } from "@/components/save-button";
import { getReportsOverview, reportResourceUrl } from "@/lib/tk";

export default async function VerslagPage() {
  const reports = await getReportsOverview();

  return (
    <main className="page-shell">
      <section className="section-heading dashboard-heading">
        <div>
          <p className="eyebrow">Verslag</p>
          <h1>Live ongecorrigeerde plenaire verslagpublicaties.</h1>
        </div>
        <div className="quiet-panel source-panel">
          <Radio size={22} aria-hidden="true" />
          <div>
            <strong>SyncFeed verslag</strong>
            <ApiStatusPill apiOk={reports.apiOk} />
          </div>
        </div>
      </section>

      <section className="result-list list-page">
        {reports.items.map((report) => {
          const id = report.Id ?? `${report.Soort}-${report.GewijzigdOp}`;
          const title = `${report.Soort ?? "Verslag"} - ${report.Status ?? "status onbekend"}`;
          const url = reportResourceUrl(report.Id);

          return (
            <article className="result-card letter-card" key={id}>
              <div className="result-main">
                <div className="result-meta">
                  <span>{report.Soort ?? "Verslag"}</span>
                  <span>{report.Status ?? "Status onbekend"}</span>
                  <span>{report.ContentType ?? "publicatie"}</span>
                </div>
                <h3>{title}</h3>
                <p>Gewijzigd: {report.GewijzigdOp ?? "onbekend"}</p>
                {url ? (
                  <div className="letter-actions">
                    <a className="secondary-button inline-flex" href={url} target="_blank" rel="noreferrer">
                      <FileText size={16} aria-hidden="true" />
                      Open bron
                    </a>
                  </div>
                ) : null}
              </div>
              <SaveButton kind="debat" refId={id} label={title} meta={{ ...report }} />
            </article>
          );
        })}
      </section>
    </main>
  );
}
