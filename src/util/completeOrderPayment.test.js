import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import completeOrderPayment from "./completeOrderPayment.js";

test("should complete payment for an order on correct input", async () => {
  const orderId = "orderId";
  const paymentId = "paymentId";
  const accountId = "accountId";
  const initialOrder = {
    _id: orderId,
    accountId,
    payments: [
      {
        _id: paymentId,
        status: "pending"
      }
    ],
    workflow: {
      status: "awaitingPayment",
      workflow: ["awaitingPayment"]
    }
  };
  const finalOrder = {
    _id: orderId,
    accountId,
    payments: [
      {
        _id: paymentId,
        status: "completed"
      }
    ],
    workflow: {
      status: "new",
      workflow: ["awaitingPayment", "new"]
    }
  };

  mockContext.collections.Orders.findOne.mockReturnValueOnce(Promise.resolve(initialOrder));
  mockContext.collections.Orders.updateOne.mockReturnValueOnce(Promise.resolve(finalOrder));

  await completeOrderPayment(mockContext, { orderId, paymentId });

  expect(mockContext.collections.Orders.updateOne).toHaveBeenCalledWith({
    "_id": orderId,
    "payments._id": paymentId
  }, {
    $set: {
      "workflow": {
        status: "new"
      },
      "payments.$.status": "completed"
    },
    $push: {
      "workflow.workflow": "new"
    }
  });

  expect(mockContext.appEvents.emit).toHaveBeenCalledWith("afterOrderCreate", {
    createdBy: accountId,
    order: finalOrder
  });
});
