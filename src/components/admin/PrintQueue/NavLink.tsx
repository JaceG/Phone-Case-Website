import type { ServerProps } from 'payload'
import React from 'react'

import { PRINT_QUEUE_PATH } from './index'

/**
 * Rendered via `admin.components.afterNavLinks`, right under the collection
 * groups in the admin sidebar. Uses Payload's own nav classes so it looks like
 * any other nav entry.
 */
export const PrintQueueNavLink: React.FC<ServerProps> = ({ payload }) => {
  const adminRoute = payload.config.routes.admin

  return (
    <div className="nav-group" style={{ marginTop: '1rem' }}>
      <div className="nav-group__toggle" style={{ cursor: 'default' }}>
        <div className="nav-group__label">Production</div>
      </div>
      <div className="nav-group__content">
        <a className="nav__link" href={`${adminRoute}${PRINT_QUEUE_PATH}`}>
          <span className="nav__link-label">Print queue</span>
        </a>
      </div>
    </div>
  )
}

export default PrintQueueNavLink
