/* Admin-only extensions: a slider widget and live previews that mirror the public site. */
(function () {
  var h = window.h
  var createClass = window.createClass

  // --- Slider widget (used for logo size)
  var RangeControl = createClass({
    handleChange: function (e) {
      this.props.onChange(Number(e.target.value))
    },
    render: function () {
      var f = this.props.field
      var min = f.get('min', 0), max = f.get('max', 100), step = f.get('step', 1)
      var value = this.props.value == null ? f.get('default', max) : this.props.value
      return h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' } },
        h('span', { style: { fontSize: 12, color: '#798291' } }, 'Smaller'),
        h('input', {
          type: 'range', min: min, max: max, step: step, value: value,
          id: this.props.forID, className: this.props.classNameWrapper,
          onChange: this.handleChange, style: { flex: 1, accentColor: '#021464' },
        }),
        h('span', { style: { fontSize: 12, color: '#798291' } }, 'Larger'),
        h('strong', { style: { minWidth: 44, textAlign: 'right' } }, value + '%'),
      )
    },
  })
  var RangePreview = createClass({
    render: function () { return h('span', {}, this.props.value + '%') },
  })
  CMS.registerWidget('range', RangeControl, RangePreview)

  // --- Partner logos preview: same layout as the public Strategic Partners grid
  var tierColors = { Title: '#034c8c', Gold: '#7a7a1f', Silver: '#9c9c9c', Bronze: '#5a5240' }
  var tierCols = { Title: 1, Gold: 3, Silver: 2, Bronze: 6 }
  var tierHeight = { Title: 192, Gold: 144, Silver: 112, Bronze: 80 }
  var tierLogoHeight = { Title: 120, Gold: 64, Silver: 44, Bronze: 30 }

  var PartnersPreview = createClass({
    render: function () {
      var entry = this.props.entry
      var getAsset = this.props.getAsset
      var tiers = entry.getIn(['data', 'tiers']) || []
      return h(
        'div',
        { style: { fontFamily: 'Inter, system-ui, sans-serif', padding: 32, background: '#fff' } },
        h('p', { style: { color: '#a38a00', fontSize: 12, letterSpacing: '0.2em', fontWeight: 700 } }, 'STRATEGIC PARTNERS'),
        h('h1', { style: { color: '#021464', fontSize: 28, margin: '8px 0 24px' } }, 'Thank you to our Strategic Partners'),
        tiers.map(function (t, i) {
          var tier = t.get('tier') || 'Gold'
          var partners = t.get('partners') || []
          var logoSize = t.get('logoSize') == null ? 100 : t.get('logoSize')
          return h(
            'div',
            { key: i, style: { marginBottom: 40 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
              h('span', { style: { background: tierColors[tier] || '#021464', color: '#fff', borderRadius: 999, padding: '4px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' } }, tier),
              h('span', { style: { flex: 1, height: 1, background: '#e2e8f0' } }),
            ),
            h('div', { style: { display: 'grid', gap: 16, marginTop: 20, gridTemplateColumns: 'repeat(' + (tierCols[tier] || 4) + ', minmax(0, 1fr))', maxWidth: tier === 'Title' ? 448 : tier === 'Silver' ? 512 : 'none' } },
              partners.map(function (p, j) {
                var logo = p.get('logo')
                var boxH = Math.round(((tierLogoHeight[tier] || 88) * logoSize * (p.get('adjust') == null ? 100 : p.get('adjust'))) / 10000)
                return h(
                  'div',
                  { key: j, style: { height: tierHeight[tier] || 112, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,.05)', background: '#fff' } },
                  logo
                    ? h('div', { style: { width: '100%', height: boxH, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                        h('img', { src: getAsset(logo).toString(), alt: p.get('name') || '', style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } }))
                    : h('span', { style: { color: '#94a3b8', fontSize: 12 } }, p.get('name') || 'Logo'),
                )
              }),
            ),
          )
        }),
      )
    },
  })
  CMS.registerPreviewTemplate('partners', PartnersPreview)

  var navy = '#021464', gold = '#a38a00'
  function str(v) { return v == null ? '' : String(v) }
  function list(v) { return v && v.toJS ? v.toJS() : v || [] }

  var ConferencePreview = createClass({
    render: function () {
      var d = this.props.entry.get('data')
      var getAsset = this.props.getAsset
      var banner = d.get('bannerImage')
      var agenda = list(d.get('agenda'))
      var levels = list(d.get('sponsorshipLevels'))
      var gallery = list(d.get('gallery'))
      var details = [['Date', d.get('date')], ['Time', d.get('time')], ['Venue', d.get('venue')], ['Room', d.get('room')]]
      return h(
        'div',
        { style: { fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a', background: '#fff' } },
        h(
          'div',
          { style: { position: 'relative', background: navy, color: '#fff', padding: '48px 32px', minHeight: 260, overflow: 'hidden' } },
          banner ? h('img', { src: getAsset(banner).toString(), alt: '', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 } }) : null,
          h('div', { style: { position: 'relative' } },
            h('p', { style: { color: '#c9ad1a', fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 } }, str(d.get('eyebrow'))),
            h('h1', { style: { fontSize: 34, fontWeight: 800, margin: '12px 0 20px' } }, str(d.get('title'))),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 } },
              details.map(function (x) {
                return h('div', { key: x[0], style: { background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' } },
                  h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#c9ad1a' } }, x[0]),
                  h('div', { style: { fontWeight: 600, marginTop: 2 } }, str(x[1])))
              }))),
        ),
        h('div', { style: { padding: '32px' } },
          h('p', { style: { color: gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 } }, 'Conference Agenda'),
          h('h2', { style: { color: navy, fontSize: 26, fontWeight: 800, margin: '6px 0 20px' } }, str(d.get('date'))),
          agenda.map(function (a, i) {
            return h('div', { key: i, style: { display: 'flex', gap: 16, padding: '14px 0', borderTop: '1px solid #e2e8f0' } },
              h('div', { style: { minWidth: 110, fontWeight: 700, color: navy } }, str(a.time)),
              h('div', {},
                a.session ? h('div', { style: { fontSize: 11, color: gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' } }, str(a.session)) : null,
                h('div', { style: { fontWeight: 600 } }, str(a.title)),
                a.description ? h('p', { style: { margin: '6px 0 0', color: '#475569', fontSize: 14 } }, str(a.description)) : null,
                (a.panelists || []).map(function (pl, j) {
                  return h('p', { key: j, style: { margin: '6px 0 0', fontSize: 13, color: '#475569' } }, h('strong', {}, str(pl.name) + ' — '), str(pl.bio))
                })))
          }),
          h('h2', { style: { color: navy, fontSize: 26, fontWeight: 800, margin: '40px 0 16px' } }, str(d.get('sponsorshipTitle'))),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 } },
            levels.map(function (l, i) {
              return h('div', { key: i, style: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 } },
                h('span', { style: { background: tierColors[l.level] || navy, color: '#fff', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' } }, str(l.level)),
                h('div', { style: { fontSize: 28, fontWeight: 800, color: navy, margin: '12px 0' } }, str(l.price)),
                h('ul', { style: { paddingLeft: 18, margin: 0, color: '#475569', fontSize: 14 } }, (l.perks || []).map(function (pk, j) { return h('li', { key: j }, str(pk)) })))
            })),
          gallery.length
            ? h('div', {},
                h('h2', { style: { color: navy, fontSize: 26, fontWeight: 800, margin: '40px 0 16px' } }, 'Gallery'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
                  gallery.map(function (g, i) {
                    return g.image ? h('img', { key: i, src: getAsset(g.image).toString(), alt: '', style: { width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8 } }) : null
                  })))
            : null,
        ),
      )
    },
  })
  CMS.registerPreviewTemplate('conference', ConferencePreview)
})()
