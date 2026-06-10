import { getAdminClient } from '../admin'
import type { DDNetworkPortRow, DDNetworkPortInsert } from '../types'

export async function queryDeleteNetworkPortsByReportId(reportId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from('dd_network_ports')
    .delete()
    .eq('report_id', reportId)
  if (error) throw new Error(`queryDeleteNetworkPortsByReportId: ${error.message}`)
}

export async function queryInsertNetworkPorts(inserts: DDNetworkPortInsert[]): Promise<void> {
  if (inserts.length === 0) return
  const { error } = await getAdminClient().from('dd_network_ports').insert(inserts)
  if (error) throw new Error(`queryInsertNetworkPorts: ${error.message}`)
}

export async function querySelectNetworkPortsByReportId(reportId: string): Promise<DDNetworkPortRow[]> {
  const { data, error } = await getAdminClient()
    .from('dd_network_ports')
    .select('id, report_id, device_id, report_date, port_name, speed, duplex, link_status, mac_address, port_type, autoneg')
    .eq('report_id', reportId)
    .order('port_name')
  if (error) throw new Error(`querySelectNetworkPortsByReportId: ${error.message}`)
  return data ?? []
}
