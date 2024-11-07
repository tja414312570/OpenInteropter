import { dialog, MessageBoxOptions, MessageBoxReturnValue } from 'electron';
const showErrorDialog = (errorMessage) => {
    dialog.showMessageBox({
        type: 'error',
        title: '错误',
        message: '发生错误',
        detail: errorMessage,
        buttons: ['确定'],
        defaultId: 0,
    }).then(result => {
        console.log('错误弹窗已关闭');
    }).catch(err => {
        console.error('显示错误弹窗时发生错误:', err);
    });
};


export {
    showErrorDialog
};