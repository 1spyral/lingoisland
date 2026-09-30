import { NextResponse } from 'next/server'
import { mapJourneyIslandRow } from '@/lib/journey/mapJourneyNodes'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_journey_id')
      .eq('id', user.id)
      .maybeSingle()

    const jid = profile?.active_journey_id
    if (!jid) {
      return NextResponse.json({ journey: null, islands: [] })
    }

    const { data: journey, error: jErr } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', jid)
      .eq('user_id', user.id)
      .maybeSingle()

    if (jErr || !journey) {
      return NextResponse.json({ journey: null, islands: [] })
    }

    const { data: islands } = await supabase
      .from('journey_islands')
      .select('*')
      .eq('journey_id', journey.id)
      .order('step_order', { ascending: true })

    const nodesOut = (islands ?? []).map((row) => mapJourneyIslandRow(row))
    const islandsOut = nodesOut.filter((row) => row.node_type === 'island')

    return NextResponse.json({ journey, islands: islandsOut, nodes: nodesOut })
  } catch (e) {
    console.error('[journey/active]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
