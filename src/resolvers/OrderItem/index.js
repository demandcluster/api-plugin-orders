import resolveShopFromShopId from "@reactioncommerce/api-utils/graphql/resolveShopFromShopId.js";
import { encodeOrderItemOpaqueId } from "../../xforms/id.js";
import imageURLs from "../../util/imageURLs.js";
import productTags from "./productTags.js";

export default {
  _id: (node) => encodeOrderItemOpaqueId(node._id),
  productTags,
  shop: resolveShopFromShopId,
  status: (node) => node.workflow.status,
  imageURLs: (node, args, context) => imageURLs(node, context)
};
