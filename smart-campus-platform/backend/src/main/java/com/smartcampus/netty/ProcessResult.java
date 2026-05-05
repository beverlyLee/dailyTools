package com.smartcampus.netty;

import lombok.Data;

@Data
public class ProcessResult {
    private boolean success;
    private String message;
    private Object data;

    public static ProcessResult success(Object data) {
        ProcessResult result = new ProcessResult();
        result.setSuccess(true);
        result.setData(data);
        return result;
    }

    public static ProcessResult success() {
        return success(null);
    }

    public static ProcessResult error(String message) {
        ProcessResult result = new ProcessResult();
        result.setSuccess(false);
        result.setMessage(message);
        return result;
    }
}
