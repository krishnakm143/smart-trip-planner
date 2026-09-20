export function toJSONPlugin(schema) {
  schema.set('toJSON', {
    versionKey: false,
    flattenObjectIds: true,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  });
}
