import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import type { Artwork, Order } from '@/payload-types'
import { checkRole } from '@/access/utilities'

/**
 * Operator view: every order that still needs printing, oldest first.
 *
 * Deliberately plain. It's a work list for someone standing at a printer,
 * so it reads top-to-bottom, links straight to the print master file, and
 * links to the order for status changes. Statuses beyond "printing" drop
 * off the list; the Orders collection has the full history.
 */

export const PRINT_QUEUE_PATH = '/print-queue'

const QUEUE_STATUSES = ['queued', 'printing'] as const

const cellStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid var(--theme-elevation-150)',
  verticalAlign: 'top',
  textAlign: 'left',
}

const headStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
  borderBottom: '2px solid var(--theme-elevation-250)',
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

type PrintJob = NonNullable<Order['printJobs']>[number]

const artworkFilename = (job: PrintJob) => {
  const artwork = job.artwork
  if (artwork && typeof artwork === 'object') return (artwork as Artwork).filename ?? undefined
  return undefined
}

export const PrintQueue: React.FC<AdminViewServerProps> = async ({
  initPageResult,
  params,
  searchParams,
}) => {
  const { req } = initPageResult
  const { payload, user } = req

  const adminRoute = payload.config.routes.admin

  if (!user || !checkRole(['admin'], user)) {
    redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}${PRINT_QUEUE_PATH}`)}`)
  }

  // depth 1 populates printJobs.artwork so the filename is available for the
  // file link. Customer is populated too, for the email fallback.
  const { docs: orders, totalDocs } = await payload.find({
    collection: 'orders',
    depth: 1,
    limit: 200,
    pagination: false,
    req,
    sort: 'createdAt',
    where: {
      'fulfillment.printStatus': { in: [...QUEUE_STATUSES] },
    },
  })

  const apiRoute = payload.config.routes.api

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      viewType="print-queue"
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <h1 style={{ marginBottom: '0.25rem' }}>Print queue</h1>
        <p style={{ marginTop: 0, color: 'var(--theme-elevation-600)' }}>
          {totalDocs === 0
            ? 'Nothing to print.'
            : `${totalDocs} order${totalDocs === 1 ? '' : 's'} waiting, oldest first. Open an order to move it along.`}
        </p>

        {totalDocs > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={headStyle}>Order</th>
                  <th style={headStyle}>Placed</th>
                  <th style={headStyle}>Customer</th>
                  <th style={headStyle}>Status</th>
                  <th style={headStyle}>Print jobs</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const customerEmail =
                    order.customerEmail ??
                    (order.customer && typeof order.customer === 'object'
                      ? order.customer.email
                      : undefined) ??
                    '—'

                  const jobs = order.printJobs ?? []

                  return (
                    <tr key={order.id}>
                      <td style={cellStyle}>
                        <a href={`${adminRoute}/collections/orders/${order.id}`}>#{order.id}</a>
                      </td>
                      <td style={cellStyle}>{formatDate(order.createdAt)}</td>
                      <td style={cellStyle}>{customerEmail}</td>
                      <td style={cellStyle}>{order.fulfillment?.printStatus ?? 'queued'}</td>
                      <td style={{ ...cellStyle, padding: 0 }}>
                        {jobs.length === 0 ? (
                          <div style={{ padding: '0.5rem 0.75rem', color: 'var(--theme-error-500)' }}>
                            No print jobs. Open the order and re-save to regenerate.
                          </div>
                        ) : (
                          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                            <tbody>
                              {jobs.map((job, index) => {
                                const filename = artworkFilename(job)
                                return (
                                  <tr key={job.id ?? index}>
                                    <td style={{ ...cellStyle, width: '40%' }}>{job.designTitle}</td>
                                    <td style={{ ...cellStyle, width: '30%' }}>
                                      {job.phoneModel ?? <em>unknown model</em>}
                                    </td>
                                    <td style={{ ...cellStyle, width: '10%' }}>×{job.quantity}</td>
                                    <td style={{ ...cellStyle, width: '20%' }}>
                                      {filename ? (
                                        <a
                                          href={`${apiRoute}/artwork/file/${encodeURIComponent(filename)}`}
                                          rel="noopener noreferrer"
                                          target="_blank"
                                        >
                                          Print master
                                        </a>
                                      ) : (
                                        <em>no artwork</em>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}

export default PrintQueue
