bru.setEnvVar('reccount', res.getBody().member?.length)
console.log('Record count:', res.getBody().member?.length);

if (res.getBody().member?.length || 0 === 1) {
    bru.setEnvVar('IPID', res.getBody().member[0].objectKey[0])
    console.log('IPID: ', res.getBody().member[0].objectKey[0])
}
if (res.getBody().member?.length || 0 === 1) {
    bru.setEnvVar('IPTitle', res.getBody().member[0].fileName[0])
    console.log('IPTitle: ', res.getBody().member[0].fileName[0])
}