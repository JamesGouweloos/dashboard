import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

const BOOKING_COLUMNS = [
  { key: 'ref', header: 'Ref #', width: 14 },
  { key: 'name', header: 'Name', width: 30 },
  { key: 'status', header: 'Status', width: 14 },
  { key: 'bookingClass', header: 'Class', width: 22 },
  { key: 'arrivalDate', header: 'Arrival Date', width: 14 },
  { key: 'departureDate', header: 'Departure Date', width: 14 },
  { key: 'bedNights', header: 'Bed Nights', width: 12 },
  { key: 'pax', header: 'Pax', width: 8 },
  { key: 'accommodation', header: 'Accommodation', width: 16 },
  { key: 'income', header: 'Accommodation & Extras', width: 22 },
  { key: 'disbursements', header: 'Disbursements', width: 16 },
  { key: 'revenueTotal', header: 'Total (Excl. VAT)', width: 18 },
  { key: 'outstanding', header: 'Amount Outstanding', width: 20 },
  { key: 'agent', header: 'Agent', width: 20 },
  { key: 'source', header: 'Source', width: 20 },
]

function styleHeaderRow(ws: ExcelJS.Worksheet) {
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.border = {
    bottom: { style: 'thin', color: { argb: 'FF8EA9DB' } }
  }
  headerRow.height = 18
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { weekKey: string } }
) {
  const { weekKey } = params

  if (!weekKey || !/^\d{4}-W\d{2}$/.test(weekKey)) {
    return NextResponse.json({ error: 'Invalid week key' }, { status: 400 })
  }

  try {
    const db = getAdminDb()

    // Load the weekly report document (updates + drop-off)
    const reportDoc = await db.doc(`weekly_sales_reports/${weekKey}`).get()
    if (!reportDoc.exists) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    const reportData = reportDoc.data() || {}

    // Load current bookings from the snapshot subcollection
    const bookingsSnap = await db
      .collection(`weekly_sales_snapshots/${weekKey}/bookings`)
      .get()
    const currentBookings = bookingsSnap.docs.map((d) => d.data())

    // Sort by arrival date then ref
    currentBookings.sort((a, b) => {
      const dateA = a.arrivalDate || ''
      const dateB = b.arrivalDate || ''
      if (dateA < dateB) return -1
      if (dateA > dateB) return 1
      return String(a.ref || '').localeCompare(String(b.ref || ''))
    })

    const updates: any[] = Array.isArray(reportData.updates) ? reportData.updates : []
    const dropOff: any[] = Array.isArray(reportData.drop_off) ? reportData.drop_off : []

    // Build workbook
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Baines Dashboard'
    wb.created = new Date()

    // --- BookingData sheet ---
    const bookingWs = wb.addWorksheet('BookingData')
    bookingWs.columns = BOOKING_COLUMNS
    styleHeaderRow(bookingWs)
    for (const row of currentBookings) {
      bookingWs.addRow({
        ref: row.ref || '',
        name: row.name || '',
        status: row.status || '',
        bookingClass: row.bookingClass || '',
        arrivalDate: row.arrivalDate || '',
        departureDate: row.departureDate || '',
        bedNights: row.bedNights ?? '',
        pax: row.pax ?? '',
        accommodation: row.accommodation ?? '',
        income: row.income ?? '',
        disbursements: row.disbursements ?? '',
        revenueTotal: row.totalExclVat ?? '',
        outstanding: row.outstanding ?? '',
        agent: row.agent || '',
        source: row.source || '',
      })
    }

    // --- Updates sheet ---
    const updatesWs = wb.addWorksheet('Updates')
    updatesWs.columns = [
      { key: 'category', header: 'Category', width: 32 },
      { key: 'ref', header: 'Ref #', width: 14 },
      { key: 'name', header: 'Name', width: 30 },
      { key: 'status', header: 'Status', width: 14 },
      { key: 'bookingClass', header: 'Class', width: 22 },
      { key: 'arrivalDate', header: 'Arrival Date', width: 14 },
      { key: 'revenueTotal', header: 'Total (Excl. VAT)', width: 18 },
      { key: 'agent', header: 'Agent', width: 20 },
      { key: 'source', header: 'Source', width: 20 },
    ]
    styleHeaderRow(updatesWs)
    for (const row of updates) {
      updatesWs.addRow({
        category: row.category || '',
        ref: row.ref || '',
        name: row.name || '',
        status: row.status || '',
        bookingClass: row.bookingClass || '',
        arrivalDate: row.arrivalDate || '',
        revenueTotal: row.totalExclVat ?? '',
        agent: row.agent || '',
        source: row.source || '',
      })
    }

    // --- Drop-off sheet ---
    const dropOffWs = wb.addWorksheet('Drop-off')
    dropOffWs.columns = [
      { key: 'ref', header: 'Ref #', width: 14 },
      { key: 'name', header: 'Name', width: 30 },
      { key: 'previousStatus', header: 'Previous Status', width: 18 },
      { key: 'bookingClass', header: 'Class', width: 22 },
      { key: 'arrivalDate', header: 'Arrival Date', width: 14 },
      { key: 'revenueTotal', header: 'Total (Excl. VAT)', width: 18 },
      { key: 'agent', header: 'Agent', width: 20 },
      { key: 'source', header: 'Source', width: 20 },
    ]
    styleHeaderRow(dropOffWs)
    for (const row of dropOff) {
      dropOffWs.addRow({
        ref: row.ref || '',
        name: row.name || '',
        previousStatus: row.previousStatus || '',
        bookingClass: row.bookingClass || '',
        arrivalDate: row.arrivalDate || '',
        revenueTotal: row.totalExclVat ?? '',
        agent: row.agent || '',
        source: row.source || '',
      })
    }

    const buffer = await wb.xlsx.writeBuffer()
    const filename = `WeeklySalesReport_${weekKey}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to generate Excel report', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
