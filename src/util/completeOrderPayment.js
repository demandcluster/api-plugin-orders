import ReactionError from "@reactioncommerce/reaction-error";

/**
 * @summary Changes the status of the specified payment to completed and changes the order
 * from state `paymentPending` to `new`
 * @param {Object} context - App context
 * @param {{orderId: string, paymentId: string}} input - Input of the captured event
 * @returns {void}
 */
export default async function completeOrderPayment(context, input) {
  const { collections: { Orders }, appEvents } = context;
  const { orderId, paymentId } = input;

  const { ok, value: orderWithCompletedPayment } = await Orders.findOneAndUpdate({
    "_id": orderId,
    "payments._id": paymentId
  }, {
    $set: {
      "workflow.status": "new",
      "payments.$.status": "completed"
    },
    $push: {
      "workflow.workflow": "new"
    }
  }, {
    returnOriginal: false
  });

  if (ok !== 1) throw new ReactionError("server-error", "Unable to update order");

  await appEvents.emit("afterOrderCreate", { createdBy: orderWithCompletedPayment.accountId, order: orderWithCompletedPayment });
}
