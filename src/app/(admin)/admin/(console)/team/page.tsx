import { Card, IconClose } from "@/components/ui";
import { currentUserId, listAdmins } from "@/lib/admin/queries";
import { InviteForm } from "./invite-form";
import { revokeAdmin } from "./actions";

export default async function TeamPage() {
  const [admins, me] = await Promise.all([listAdmins(), currentUserId()]);

  return (
    <>
      <h1 className="text-display-md">Console access</h1>
      <p className="text-body-sm text-content-secondary mt-2 mb-8 max-w-measure">
        Everyone on this list can edit products, the order form and orders. Removing someone takes
        effect on their next request; it does not delete their account.
      </p>

      <div className="flex flex-col gap-6">
        <InviteForm />

        <Card padding="none" clip>
          <ul className="divide-line divide-y">
            {admins.map((admin) => {
              const isMe = admin.user_id === me;

              return (
                <li key={admin.user_id} className="flex items-center gap-4 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="font-display text-body-sm block font-bold">
                      {admin.email}
                      {isMe && (
                        <span className="text-caption text-content-secondary ml-2 font-normal">
                          you
                        </span>
                      )}
                    </span>
                    <span className="text-caption text-content-secondary block">
                      Added{" "}
                      {new Date(admin.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </span>

                  {isMe ? (
                    // No button at all rather than a disabled one: there is no
                    // state in which removing yourself is the thing you wanted.
                    <span className="text-caption text-content-tertiary shrink-0">
                      can’t remove yourself
                    </span>
                  ) : (
                    <form action={revokeAdmin}>
                      <input type="hidden" name="user_id" value={admin.user_id} />
                      <button
                        type="submit"
                        className="text-content-secondary hover:bg-surface-sunken hover:text-danger grid size-9 place-items-center rounded-pill transition-surface"
                      >
                        <IconClose size={16} />
                        <span className="sr-only">Remove {admin.email}</span>
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
