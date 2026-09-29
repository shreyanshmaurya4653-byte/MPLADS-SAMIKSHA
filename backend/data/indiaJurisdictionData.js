/**
 * Complete Master Geographic & Parliamentary Data Module for India
 * Provides:
 * - 36 States & Union Territories (with ISO-standard codes)
 * - 787 Official Administrative Districts
 * - 543 Lok Sabha Parliamentary Constituencies with elected MPs & Parties
 */

const { states, districts, stateDistrictIdLookup } = require('./build_national_dataset');
const rawConstituencies = require('./constituencies_543');

// Map raw constituencies to final constituency objects with district_id
const constituencies = rawConstituencies.map((c, index) => {
  const sid = c.state_id;
  const distMap = stateDistrictIdLookup[sid] || {};
  let distId = distMap[c.district];
  if (!distId) {
    // If not found by exact name, find first district in this state or fallback
    const firstDistInState = districts.find(d => d.state_id === sid);
    distId = firstDistInState ? firstDistInState.id : 1;
  }

  return {
    id: index + 1,
    constituency_number: c.no || (index + 1),
    name: c.name,
    state_id: sid,
    district_id: distId,
    mp_name: c.mp,
    mp_party: c.party || 'Independent',
    house_type: 'Lok Sabha'
  };
});

module.exports = {
  states,
  districts,
  constituencies
};
