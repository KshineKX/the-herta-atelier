export const HOST_SELECTORS=Object.freeze({
 surfaces:'[data-composer-card],[data-slot="conversation.composer.bar"],[data-slot="composer"],[data-slot="chat-input"],[data-conversation-scroll] pre,[data-slot="settings"]',
 conversation:'[data-conversation-region],[data-conversation-content],[data-conversation-scroll]',
 sidebar:'[data-slot="sidebar"]',
});
export function shellFrame(doc,sidebar){
 const region=doc.querySelector(HOST_SELECTORS.conversation);if(!region||!sidebar||sidebar.contains(region))return null;
 for(let element=sidebar.parentElement;element&&element!==doc.body;element=element.parentElement){if(element.contains(region)&&doc.defaultView.getComputedStyle(element).display!=='contents')return element;}
 return null;
}
export function shouldSyncMutation(record,owned=[]){
 const target=record.target.nodeType===1?record.target:record.target.parentElement;if(!target)return false;
 if(owned.some(root=>root?.contains(target))||target.closest('.xterm'))return false;
 if(record.type==='attributes'&&target===target.ownerDocument.body&&record.attributeName==='data-ds-dark-theme')return false;
 // Streaming Markdown already inherits theme CSS. Repeated text/block updates
 // inside an established answer must not rescan geometry for the entire shell.
 if(target.closest('[data-chat-flow-key]'))return false;
 return true;
}
