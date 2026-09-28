import type {StructureResolver} from 'sanity/structure'

const caseByStatus = (S: Parameters<StructureResolver>[0], status: string, title: string) =>
  S.listItem()
    .title(title)
    .child(
      S.documentTypeList('caseFile')
        .title(title)
        .filter('_type == "caseFile" && reviewStatus == $status')
        .params({status}),
    )

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Bureau')
    .items([
      S.listItem()
        .title('Active dockets')
        .child(
          S.list()
            .title('Active dockets')
            .items([
              caseByStatus(S, 'draft', 'Drafts'),
              caseByStatus(S, 'inReview', 'In review'),
              caseByStatus(S, 'changesRequested', 'Changes requested'),
              caseByStatus(S, 'approved', 'Approved'),
              S.divider(),
              S.documentTypeListItem('caseFile').title('All case files'),
            ]),
        ),
      S.listItem()
        .title('Case contents')
        .child(
          S.documentTypeList('caseFile')
            .title('Select a case')
            .child((caseId) =>
              S.list()
                .title('Case contents')
                .items([
                  S.listItem()
                    .title('Edit case file')
                    .child(S.document().documentId(caseId).schemaType('caseFile')),
                  S.listItem()
                    .title('Incidents')
                    .child(
                      S.documentTypeList('incident')
                        .title('Incidents')
                        .filter('_type == "incident" && caseFile._ref == $caseId')
                        .params({caseId})
                        .initialValueTemplates([S.initialValueTemplateItem('incident-in-case', {caseId})]),
                    ),
                  S.listItem()
                    .title('Artifacts')
                    .child(
                      S.documentTypeList('artifact')
                        .title('Artifacts')
                        .filter('_type == "artifact" && caseFile._ref == $caseId')
                        .params({caseId})
                        .initialValueTemplates([S.initialValueTemplateItem('artifact-in-case', {caseId})]),
                    ),
                  S.listItem()
                    .title('Reviews')
                    .child(
                      S.documentTypeList('review')
                        .title('Reviews')
                        .filter('_type == "review" && caseFile._ref == $caseId')
                        .params({caseId})
                        .initialValueTemplates([S.initialValueTemplateItem('review-for-case', {caseId})]),
                    ),
                ]),
            ),
        ),
      S.divider(),
      S.listItem()
        .title('Review queue')
        .child(
          S.documentTypeList('review')
            .title('Pending reviews')
            .filter('_type == "review" && decision == "pending"')
            .defaultOrdering([{field: '_createdAt', direction: 'asc'}]),
        ),
      S.documentTypeListItem('review').title('All reviews'),
      S.divider(),
      S.documentTypeListItem('incident').title('All incidents'),
      S.documentTypeListItem('artifact').title('All artifacts'),
    ])
