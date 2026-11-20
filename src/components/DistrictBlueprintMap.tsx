import { Building2, FlaskConical, HeartPulse, Home, Landmark, Leaf, Route, School, Store, Zap } from 'lucide-react';
import type { Building, BuildingType, Community, CommunityId } from '../types/world.ts';

interface DistrictBlueprintMapProps {
  communities: Community[];
  selectedBuildingId: string | null;
  onSelectBuilding: (building: Building) => void;
}

const COMMUNITY_ACCENT: Record<CommunityId, { ring: string; text: string; bg: string }> = {
  greenfield: {
    ring: 'border-emerald-500/40',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
  },
  metrocore: {
    ring: 'border-cyan-500/40',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/5',
  },
  novadistrict: {
    ring: 'border-violet-500/40',
    text: 'text-violet-400',
    bg: 'bg-violet-500/5',
  },
};

export function formatBuildingType(type: BuildingType): string {
  const labels: Record<BuildingType, string> = {
    residential: 'Residential',
    business_centre: 'Business Centre',
    farm: 'Farm',
    research_lab: 'Research Lab',
    hospital: 'Hospital',
    school: 'School',
    market: 'Market',
    energy_facility: 'Energy Facility',
    road_transit: 'Transit Hub',
    park: 'Public Park',
  };
  return labels[type];
}

function BuildingIcon({ type }: { type: BuildingType }) {
  const cls = 'w-4 h-4 shrink-0';
  switch (type) {
    case 'residential':
      return <Home className={cls} />;
    case 'business_centre':
      return <Building2 className={cls} />;
    case 'farm':
      return <Leaf className={cls} />;
    case 'research_lab':
      return <FlaskConical className={cls} />;
    case 'hospital':
      return <HeartPulse className={cls} />;
    case 'school':
      return <School className={cls} />;
    case 'market':
      return <Store className={cls} />;
    case 'energy_facility':
      return <Zap className={cls} />;
    case 'road_transit':
      return <Route className={cls} />;
    case 'park':
      return <Landmark className={cls} />;
  }
}

export function DistrictBlueprintMap({
  communities,
  selectedBuildingId,
  onSelectBuilding,
}: DistrictBlueprintMapProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {communities.map((community) => {
        const accent = COMMUNITY_ACCENT[community.id];
        return (
          <section
            key={community.id}
            className={`rounded-xl border border-slate-800 bg-[#0F172A]/90 p-5 flex flex-col gap-4`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className={`font-display text-lg font-semibold ${accent.text}`}>
                  {community.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {community.summary}
                </p>
              </div>
              <div className="text-right shrink-0 font-mono tabular-nums text-xs text-slate-300">
                <div>Infra {community.infrastructureLevel}%</div>
                <div className="text-slate-500 mt-0.5">
                  Target {community.targetInitialPopulation} agents
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {community.buildings.map((building) => {
                const isSelected = building.buildingId === selectedBuildingId;
                return (
                  <button
                    key={building.buildingId}
                    type="button"
                    onClick={() => onSelectBuilding(building)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? `${accent.ring} ${accent.bg} text-slate-100`
                        : 'border-slate-800/80 bg-[#0B1220] text-slate-300 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={accent.text}>
                        <BuildingIcon type={building.type} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {building.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatBuildingType(building.type)} · Cap {building.capacity}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono tabular-nums text-xs text-slate-400 shrink-0 text-right">
                      <div>
                        ({building.position.x}, {building.position.z})
                      </div>
                      <div className="text-emerald-400">{building.condition}%</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
