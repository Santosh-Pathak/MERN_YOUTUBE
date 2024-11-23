const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      next(err);
    });
  };
};

// Higher Order Function => those function which can accept funtion as a parameter or return as a function
export { asyncHandler };

// const asyncHandler = () =>{}
// const asyncHandler = (funct) =>()=>{}
// const asyncHandler = (funct) =>async ()=>{}
// const asyncHandler = (funct) =>{funct()}

//this is a try catch approach but we will use promise apporacch
// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res.status(err.code || 500).json({ success: false, message: err.message });
//   }
// };
