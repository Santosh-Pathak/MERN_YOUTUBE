 class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something Gone Wrong",
        errors =[],
        stack = ""
    ){
        super(message)
        this.statusCode  =statusCode
        this.data = NULL,
        this.errors = errors
        this.message = message
        this.success = false
        
        if(stack)
        {
            this.stack = stack
        }
        else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
 }

 export {ApiError};