import {
  AttentionSourcesPanel,
  SourceMarketplace,
} from "../_components/connected-apps";
import { getAttentionSources } from "@/lib/attention-sources";
import { getCurrentUser } from "@/lib/auth";
import {
  getAvailableServices,
  getVerifiedStatusesForUser,
  type ProviderId,
} from "@/lib/integrations";

export default async function Connections() {
  const currentUser = await getCurrentUser();
  const services = getAvailableServices();
  const emptyStatuses = Object.fromEntries(
    services.map((service) => [service.id, false]),
  ) as Record<ProviderId, boolean>;
  const { statuses } = currentUser
    ? await getVerifiedStatusesForUser(currentUser.id, { persist: false })
    : { statuses: emptyStatuses };
  const attentionSources = getAttentionSources(statuses);

  return (
    <main className="page-shell flex-1 text-zinc-950">
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
          <SourceMarketplace
            currentUser={currentUser}
            services={services}
            initialStatuses={statuses}
          />
          <AttentionSourcesPanel attentionSources={attentionSources} />
        </div>
      </div>
    </main>
  );
}
